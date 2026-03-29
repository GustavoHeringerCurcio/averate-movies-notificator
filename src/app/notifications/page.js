'use client';

import { useState } from 'react';
import { Bell, MessageCircle, MessageSquare, Send } from 'lucide-react';

const PROVIDER_DISCORD = 'discord';
const PROVIDER_TELEGRAM = 'telegram';
const PROVIDER_SLACK = 'slack';

async function sendTestNotification(provider) {
  const response = await fetch('/api/notifications/test', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ provider }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Failed to send test message.');
  }

  return payload;
}

export default function NotificationsPage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [threshold, setThreshold] = useState('7.0');
  const [provider, setProvider] = useState(PROVIDER_DISCORD);
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSaveSettings = async () => {
    setError('');
    setSuccess('');
    setSaving(true);

    await new Promise((resolve) => setTimeout(resolve, 400));

    setSaving(false);
    setSuccess('Settings saved locally for this session (persistence is coming soon).');
  };

  const handleSendTest = async () => {
    setError('');
    setSuccess('');
    setTesting(true);

    try {
      const payload = await sendTestNotification(provider);
      setSuccess(payload?.message || 'Test message sent successfully.');
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : 'Failed to send test message.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="averate-app-shell px-4 pb-8 pt-5 sm:px-6 sm:pt-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-semibold">Notification Settings</h1>
          <p className="text-slate-300">Get notified when movies hit your rating threshold.</p>
        </section>

        <section className="averate-surface rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-sky-300" />
              <div>
                <p className="text-lg font-semibold">Enable Notifications</p>
                <p className="text-sm text-slate-300">Receive alerts for high-rated movies.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNotificationsEnabled((current) => !current)}
              className={`averate-toggle ${notificationsEnabled ? 'averate-toggle-on' : ''}`}
              aria-pressed={notificationsEnabled}
              aria-label="Enable notifications"
            >
              <span className="averate-toggle-knob" />
            </button>
          </div>
        </section>

        <section className="averate-surface rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Rating Threshold</h2>
          <p className="text-sm text-slate-300">Notify me when Averate is above</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
              className="averate-input rounded-xl px-3 py-2 w-28"
            />
            <span className="text-slate-200">/ 10</span>
          </div>
        </section>

        <section className="averate-surface rounded-2xl p-5 sm:p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Choose Notification Platform</h2>

          <div>
            <label className="text-sm text-slate-300" htmlFor="provider-select">
              Provider
            </label>
            <select
              id="provider-select"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              className="averate-input mt-1 w-full max-w-xs rounded-xl px-3 py-2"
            >
              <option value={PROVIDER_DISCORD}>Discord</option>
              <option value={PROVIDER_TELEGRAM} disabled>Telegram (coming soon)</option>
              <option value={PROVIDER_SLACK} disabled>Slack (coming soon)</option>
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <button
              type="button"
              onClick={() => setProvider(PROVIDER_DISCORD)}
              className={`averate-provider-card ${provider === PROVIDER_DISCORD ? 'averate-provider-card-active' : ''}`}
            >
              <MessageCircle className="h-7 w-7" />
              <p className="mt-2 text-xl font-semibold">Discord</p>
              <p className="text-sm text-slate-300">Webhook URL</p>
            </button>

            <div className="averate-provider-card averate-provider-card-disabled">
              <Send className="h-7 w-7" />
              <p className="mt-2 text-xl font-semibold">Telegram</p>
              <p className="text-sm text-slate-300">Bot token + chat ID</p>
              <span className="averate-badge">Coming soon</span>
            </div>

            <div className="averate-provider-card averate-provider-card-disabled">
              <MessageSquare className="h-7 w-7" />
              <p className="mt-2 text-xl font-semibold">Slack</p>
              <p className="text-sm text-slate-300">Webhook URL</p>
              <span className="averate-badge">Coming soon</span>
            </div>
          </div>
        </section>

        <section className="averate-surface rounded-2xl p-5 sm:p-6 space-y-3">
          <h2 className="text-2xl font-semibold">Discord Configuration</h2>
          <label className="text-sm text-slate-300" htmlFor="discord-webhook">
            Discord webhook URL
          </label>
          <input
            id="discord-webhook"
            type="url"
            value={discordWebhook}
            onChange={(event) => setDiscordWebhook(event.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="averate-input rounded-xl px-3 py-2 w-full"
          />
          <p className="text-sm text-slate-400">
            This field is UI-only for now. Test messages use your server environment variable.
          </p>
        </section>

        <section className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleSendTest}
            disabled={testing || provider !== PROVIDER_DISCORD}
            className="averate-btn averate-btn-secondary rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? 'Sending test...' : 'Send test message'}
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="averate-btn averate-btn-primary rounded-full px-6 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </section>

        {success && <p className="text-sm text-emerald-300">{success}</p>}
        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
}
