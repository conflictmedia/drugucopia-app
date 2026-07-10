/// Ongoing notification commands for Android.
///
/// On Android these use the `with_webview` + `jni_handle().exec()` API
/// to access the JNI environment and Android Activity context, then call
/// OngoingNotificationHelper.kt which creates notifications with
/// `setOngoing(true)` (unswipeable) on a low-importance channel
/// (no sound/vibration).
///
/// On all other platforms they are no-ops (the JS side falls back to
/// the browser Notification API).
use tauri::command;

#[command]
pub async fn show_ongoing_notification(
    app: tauri::AppHandle,
    id: i32,
    title: String,
    body: String,
) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        use std::sync::mpsc;
        use tauri::Manager;

        let (tx, rx) = mpsc::channel();

        let webview_window = app
            .get_webview_window("main")
            .ok_or("Could not get main webview window")?;

        // Clone data for error handling
        let _title_clone = title.clone();
        let _body_clone = body.clone();

        let result = webview_window
            .with_webview(move |wv| {
                wv.jni_handle().exec(move |env, context, _webview| {
                    let result = (|| -> Result<(), String> {
                        use jni::objects::{JValue, JString};

                        // Convert Rust strings to Java strings
                        let j_title: JString = env
                            .new_string(&title)
                            .map_err(|e| format!("new_string title: {e:?}"))?;
                        let j_body: JString = env
                            .new_string(&body)
                            .map_err(|e| format!("new_string body: {e:?}"))?;

                        // Find the Kotlin helper class (local ref, must delete)
                        let class = env
                            .find_class("com/drugucopia/app/OngoingNotificationHelper")
                            .map_err(|e| format!("find_class: {e:?}"))?;

                        // Call: OngoingNotificationHelper.show(Context, int, String, String)
                        let call_result = env.call_static_method(
                            &class,
                            "show",
                            "(Landroid/content/Context;ILjava/lang/String;Ljava/lang/String;)V",
                            &[
                                JValue::Object(context),
                                JValue::Int(id),
                                JValue::Object(&*j_title),
                                JValue::Object(&*j_body),
                            ],
                        );

                        // Check for pending Java exception BEFORE anything else.
                        // If the Kotlin side threw (e.g. SecurityException from
                        // missing POST_NOTIFICATIONS permission on Android 13+),
                        // we must clear it here to prevent a native crash when
                        // this JNI thread exits.
                        // Use if-let to make exception_check failures non-fatal —
                        // even if checking fails, we don't want the process to
                        // crash; the worst case is a leaked exception descriptor.
                        if let Ok(has_exception) = env.exception_check() {
                            if has_exception {
                                let _ = env.exception_describe();
                                let _ = env.exception_clear();
                                eprintln!(
                                    "[ongoing-notif] Kotlin show() threw — clearing exception to prevent crash"
                                );
                            }
                        }

                        call_result
                            .map_err(|e| format!("call show: {e:?}"))?;

                        // Delete local references
                        let _ = env.delete_local_ref(class);
                        let _ = env.delete_local_ref(j_title);
                        let _ = env.delete_local_ref(j_body);

                        Ok(())
                    })();

                    let _ = tx.send(result);
                });
            })
            .map_err(|e| format!("with_webview failed: {e:?}"));

        // Handle webview access errors gracefully
        if let Err(e) = result {
            eprintln!("[ongoing-notif] Webview access failed (app may be backgrounded): {e}");
            // Don't crash - just log and return OK
            // This prevents crashes when notifications are sent during app lifecycle transitions
            return Ok(());
        }

        rx.recv()
            .map_err(|e| format!("channel recv failed: {e:?}"))?
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, id, title, body);
        Ok(())
    }
}

#[command]
pub async fn cancel_ongoing_notification(
    app: tauri::AppHandle,
    id: i32,
) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        use std::sync::mpsc;
        use tauri::Manager;

        let (tx, rx) = mpsc::channel();

        let webview_window = app
            .get_webview_window("main")
            .ok_or("Could not get main webview window")?;

        let result = webview_window
            .with_webview(move |wv| {
                wv.jni_handle().exec(move |env, context, _webview| {
                    let result = (|| -> Result<(), String> {
                        use jni::objects::JValue;

                        let class = env
                            .find_class("com/drugucopia/app/OngoingNotificationHelper")
                            .map_err(|e| format!("find_class: {e:?}"))?;

                        // Call: OngoingNotificationHelper.cancel(Context, int)
                        let call_result = env.call_static_method(
                            &class,
                            "cancel",
                            "(Landroid/content/Context;I)V",
                            &[JValue::Object(context), JValue::Int(id)],
                        );

                        // Check for pending Java exception (same defensive pattern as show)
                        if let Ok(has_exception) = env.exception_check() {
                            if has_exception {
                                let _ = env.exception_describe();
                                let _ = env.exception_clear();
                                eprintln!(
                                    "[ongoing-notif] Kotlin cancel() threw — clearing exception to prevent crash"
                                );
                            }
                        }

                        call_result
                            .map_err(|e| format!("call cancel: {e:?}"))?;

                        // Delete local reference
                        let _ = env.delete_local_ref(class);

                        Ok(())
                    })();

                    let _ = tx.send(result);
                });
            })
            .map_err(|e| format!("with_webview failed: {e:?}"));

        // Handle webview access errors gracefully
        if let Err(e) = result {
            eprintln!("[ongoing-notif] Webview access failed during cancel (app may be backgrounded): {e}");
            // Don't crash - just log and return OK
            return Ok(());
        }

        rx.recv()
            .map_err(|e| format!("channel recv failed: {e:?}"))?
    }

    #[cfg(not(target_os = "android"))]
    {
        let _ = (app, id);
        Ok(())
    }
}
