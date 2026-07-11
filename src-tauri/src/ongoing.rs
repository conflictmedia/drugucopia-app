/// Timeline notification commands for Android.
///
/// On Android these use the `with_webview` + `jni_handle().exec()` API
/// to access the JNI environment and Android Activity context, then call
/// OngoingNotificationHelper.kt which creates swipeable (setOngoing=false)
/// notifications on a low-importance channel (no sound/vibration).
/// The JavaScript timeline engine handles re-appearing notifications
/// after a configurable cooldown when swiped away.
///
/// On all other platforms they are no-ops (the JS side falls back to
/// the browser Notification API).
use tauri::command;

/// Show (or update) an ongoing timeline notification.
///
/// NOTE: This is a **synchronous** Tauri command (not async) to avoid
/// blocking the async runtime with JNI mpsc::recv() — previously this
/// was `pub async fn` which caused thread-pool exhaustion and eventual
/// ANR/crash after ~30s when the timeline notification interval fired
/// repeatedly.  Making it sync lets Tauri run it on the blocking thread
/// pool where blocking recv is safe.
///
/// All JNI errors are caught and logged — the command NEVER panics,
/// preventing a single bad notification from crashing the entire app.
#[command]
pub fn show_ongoing_notification(
    app: tauri::AppHandle,
    id: i32,
    title: String,
    body: String,
) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        use std::sync::mpsc;
        use std::time::Duration;
        use tauri::Manager;

        // Sanitize inputs to prevent JNI crashes from malformed strings
        let title = title.chars().take(45).collect::<String>();
        let body = body.chars().take(90).collect::<String>();
        let id = id.clamp(1000, 19999); // keep in safe range

        let (tx, rx) = mpsc::channel();

        let webview_window = match app.get_webview_window("main") {
            Some(w) => w,
            None => {
                eprintln!("[ongoing-notif] no main webview — skipping (app likely backgrounded)");
                return Ok(()); // not an error, just skip
            }
        };

        let result = webview_window.with_webview(move |wv| {
            wv.jni_handle().exec(move |env, activity, _webview| {
                let result: Result<(), String> = (|| {
                    use jni::objects::JValue;

                    // Create Java strings — use AutoLocal to ensure cleanup
                    let j_title = match env.new_string(&title) {
                        Ok(s) => s,
                        Err(e) => return Err(format!("new_string title: {e:?}")),
                    };
                    let j_body = match env.new_string(&body) {
                        Ok(s) => s,
                        Err(e) => return Err(format!("new_string body: {e:?}")),
                    };

                    // Find helper class
                    let class = match env.find_class("com/drugucopia/app/OngoingNotificationHelper")
                    {
                        Ok(c) => c,
                        Err(e) => {
                            // clear exception if find_class threw
                            let _ = env.exception_clear();
                            return Err(format!("find_class: {e:?}"));
                        }
                    };

                    // Call static method
                    let call_result = env.call_static_method(
                        &class,
                        "show",
                        "(Landroid/content/Context;ILjava/lang/String;Ljava/lang/String;)V",
                        &[
                            JValue::Object(&activity),
                            JValue::Int(id),
                            JValue::Object(&j_title),
                            JValue::Object(&j_body),
                        ],
                    );

                    // ALWAYS check for Java exception first — prevents native crash
                    if let Ok(true) = env.exception_check() {
                        let _ = env.exception_describe();
                        let _ = env.exception_clear();
                        eprintln!(
                            "[ongoing-notif] Java exception in show() — cleared to prevent crash"
                        );
                        return Err("java exception in show()".into());
                    }

                    call_result
                        .map(|_| ())
                        .map_err(|e| format!("call show: {e:?}"))
                    // Local refs (j_title, j_body, class) are auto-freed when this JNI frame returns.
                    // Only 3 refs — well under the 512 local-ref limit, safe to rely on auto-cleanup.
                })();

                let _ = tx.send(result);
            });
        });

        if let Err(e) = result {
            eprintln!("[ongoing-notif] with_webview failed (app may be backgrounded): {e}");
            return Ok(()); // never crash the app for a notification failure
        }

        // Use timeout to prevent indefinite blocking — 1.5s is plenty for a local JNI call
        match rx.recv_timeout(Duration::from_millis(1500)) {
            Ok(inner) => {
                if let Err(e) = inner {
                    eprintln!("[ongoing-notif] inner failed: {e}");
                    // Do NOT propagate to JS — prevents crash loop
                    return Ok(());
                }
                Ok(())
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                eprintln!(
                    "[ongoing-notif] JNI call timed out after 1500ms — skipping to prevent ANR"
                );
                return Ok(()); // treat timeout as non-fatal
            }
            Err(e) => {
                eprintln!("[ongoing-notif] channel recv failed: {e:?}");
                return Ok(()); // never propagate channel errors to JS — prevents crash loop
            }
        }
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, id, title, body);
        Ok(())
    }
}

#[command]
pub fn cancel_ongoing_notification(app: tauri::AppHandle, id: i32) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        use std::sync::mpsc;
        use std::time::Duration;
        use tauri::Manager;

        let id = id.clamp(1000, 19999);

        let (tx, rx) = mpsc::channel();

        let webview_window = match app.get_webview_window("main") {
            Some(w) => w,
            None => {
                // App backgrounded — silently skip, notification will clear on next launch
                return Ok(());
            }
        };

        let result = webview_window.with_webview(move |wv| {
            wv.jni_handle().exec(move |env, activity, _webview| {
                let result: Result<(), String> = (|| {
                    use jni::objects::JValue;

                    let class = match env.find_class("com/drugucopia/app/OngoingNotificationHelper")
                    {
                        Ok(c) => c,
                        Err(e) => {
                            let _ = env.exception_clear();
                            return Err(format!("find_class cancel: {e:?}"));
                        }
                    };

                    let call_result = env.call_static_method(
                        &class,
                        "cancel",
                        "(Landroid/content/Context;I)V",
                        &[JValue::Object(&activity), JValue::Int(id)],
                    );

                    if let Ok(true) = env.exception_check() {
                        let _ = env.exception_describe();
                        let _ = env.exception_clear();
                        eprintln!("[ongoing-notif] Java exception in cancel() — cleared");
                        return Err("java exception in cancel()".into());
                    }

                    call_result
                        .map(|_| ())
                        .map_err(|e| format!("call cancel: {e:?}"))
                })();

                let _ = tx.send(result);
            });
        });

        if result.is_err() {
            // webview gone — not fatal
            return Ok(());
        }

        match rx.recv_timeout(Duration::from_millis(1000)) {
            Ok(inner) => {
                // cancel failures are non-critical — log but don't propagate
                if let Err(e) = inner {
                    eprintln!("[ongoing-notif] cancel failed (non-critical): {e}");
                }
                Ok(())
            }
            Err(_) => {
                // timeout — non-critical
                Ok(())
            }
        }
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, id);
        Ok(())
    }
}
