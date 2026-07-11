import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Bell,
  BellOff,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { useTimelineNotificationStore } from '@/store/timeline-notification-store'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function TimelineNotificationSettings() {
  const {
    settings,
    updateSettings,
    initialize,
  } = useTimelineNotificationStore()

  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize store on mount
  if (!isInitialized) {
    initialize()
    setIsInitialized(true)
  }

  const handleUpdateSetting = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K]
  ) => {
    updateSettings({ [key]: value })
    toast({
      title: 'Setting updated',
      description: `${key} set to ${String(value)}`,
    })
  }

  const handleCooldownChange = (value: number) => {
    const clamped = Math.max(1, Math.min(60, value))
    handleUpdateSetting('notificationCooldownMinutes', clamped)
  }

  const handleResetDefaults = () => {
    updateSettings({
      enabled: true,
      reappearAfterSwipe: true,
      notificationCooldownMinutes: 1,
      showOnPhaseChangeOnly: true,
      showOnForeground: true,
    })
    toast({ title: 'Settings reset to defaults' })
  }

  return (
    <Card className="py-3 gap-2">
      <CardHeader className="pb-1">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-purple-500" />
          Timeline Notifications
        </CardTitle>
        <CardDescription>
          Configure live timeline notifications for active doses
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Master toggle ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Enable timeline notifications</p>
            <p className="text-xs text-neutral-content">
              Show live intensity notifications for active doses
            </p>
          </div>
          <Button
            variant={settings.enabled ? 'default' : 'outline'}
            size="sm"
            className="gap-1 shrink-0"
            onClick={() => handleUpdateSetting('enabled', !settings.enabled)}
          >
            {settings.enabled ? (
              <Bell className="h-3.5 w-3.5" />
            ) : (
              <BellOff className="h-3.5 w-3.5" />
            )}
            {settings.enabled ? 'On' : 'Off'}
          </Button>
        </div>

        <Separator className="my-1" />

        {/* ── Reappear after swipe ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Reappear after swipe away</p>
            <p className="text-xs text-neutral-content">
              When enabled, notifications will reappear after being dismissed,
              respecting the cooldown period below
            </p>
          </div>
          <Button
            variant={settings.reappearAfterSwipe ? 'default' : 'outline'}
            size="sm"
            className="gap-1 shrink-0"
            onClick={() =>
              handleUpdateSetting('reappearAfterSwipe', !settings.reappearAfterSwipe)
            }
            disabled={!settings.enabled}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {settings.reappearAfterSwipe ? 'On' : 'Off'}
          </Button>
        </div>

        {/* ── Notification cooldown ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Notification cooldown</p>
              <p className="text-xs text-neutral-content">
                Minimum time between notifications for the same substance
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleCooldownChange(settings.notificationCooldownMinutes - 1)}
                disabled={!settings.enabled || settings.notificationCooldownMinutes <= 1}
              >
                <span className="text-base">−</span>
              </Button>
              <Input
                type="number"
                value={settings.notificationCooldownMinutes}
                onChange={(e) => handleCooldownChange(parseInt(e.target.value) || 1)}
                min={1}
                max={60}
                className="w-20 text-center text-sm"
                disabled={!settings.enabled}
              />
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleCooldownChange(settings.notificationCooldownMinutes + 1)}
                disabled={!settings.enabled || settings.notificationCooldownMinutes >= 60}
              >
                <span className="text-base">+</span>
              </Button>
              <span className="text-xs text-neutral-content">min</span>
            </div>
          </div>
        </div>

        {/* ── Show on phase change only ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Notify on phase change only</p>
            <p className="text-xs text-neutral-content">
              When enabled, only send notifications when the phase changes
              (onset → comeup → peak → offset). When disabled, notify on every check
            </p>
          </div>
          <Button
            variant={settings.showOnPhaseChangeOnly ? 'default' : 'outline'}
            size="sm"
            className="gap-1 shrink-0"
            onClick={() =>
              handleUpdateSetting('showOnPhaseChangeOnly', !settings.showOnPhaseChangeOnly)
            }
            disabled={!settings.enabled}
          >
            {settings.showOnPhaseChangeOnly ? (
              <Badge variant="outline" className="border-green-500/30 text-green-500 gap-1">
                <ShieldCheck className="h-3 w-3" />
                On
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/30 text-amber-500 gap-1">
                <AlertTriangle className="h-3 w-3" />
                Off
              </Badge>
            )}
          </Button>
        </div>

        {/* ── Show on foreground ── */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Notify when app comes to foreground</p>
            <p className="text-xs text-neutral-content">
              Send a notification when you open the app and have active doses
            </p>
          </div>
          <Button
            variant={settings.showOnForeground ? 'default' : 'outline'}
            size="sm"
            className="gap-1 shrink-0"
            onClick={() =>
              handleUpdateSetting('showOnForeground', !settings.showOnForeground)
            }
            disabled={!settings.enabled}
          >
            {settings.showOnForeground ? (
              <Badge variant="outline" className="border-green-500/30 text-green-500 gap-1">
                <ShieldCheck className="h-3 w-3" />
                On
              </Badge>
            ) : (
              <Badge variant="outline" className="border-neutral-content/30 text-neutral-content gap-1">
                <ShieldAlert className="h-3 w-3" />
                Off
              </Badge>
            )}
          </Button>
        </div>

        <Separator className="my-1" />

        {/* ── Spam protection info ── */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-base-200/50">
          <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
          <div className="text-xs text-base-content/80 space-y-1">
            <p><strong>Spam protection:</strong> Maximum 3 notifications per hour per substance.</p>
            <p>When the cooldown is active or the hourly limit is reached, notifications are silently skipped.</p>
            <p className="text-neutral-content/70">
              Cooldown: {settings.notificationCooldownMinutes} minute{settings.notificationCooldownMinutes !== 1 ? 's' : ''} •
              Reappear after swipe: {settings.reappearAfterSwipe ? 'On' : 'Off'}
            </p>
          </div>
        </div>

        {/* ── Reset to defaults ── */}
        <div className="flex justify-end pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-neutral-content hover:text-error"
            onClick={handleResetDefaults}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}