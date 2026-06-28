'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppAlert } from '@/lib/alert';
import { useLocale } from '@/components/LocaleProvider';
import { Save, Settings2, Shield, Key, Bell, Bot, Radar, FileText, Globe, User, Palette, RefreshCw } from 'lucide-react';

const categories = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'api_keys', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'agent_defaults', label: 'Agent Defaults', icon: Bot },
  { id: 'discovery', label: 'Discovery', icon: Radar },
  { id: 'logging', label: 'Logging', icon: FileText },
  { id: 'proxy', label: 'Proxy', icon: Globe },
];

export default function SettingsPage() {
  const { refreshLanguage } = useLocale();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [profile, setProfile] = useState<Record<string, any>>({});
  const [dirty, setDirty] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.settings.list().then((list: any) => {
      if (!Array.isArray(list)) { setError('Expected array, got ' + typeof list); return; }
      const map: Record<string, any> = {};
      list.forEach((s: any) => { map[s.key] = s; });
      setSettings(map);
    }).catch((e) => { setError(e.message); });
    api.settings.getProfile().then(setProfile).catch(() => {});
  }, []);

  function setSetting(key: string, value: any) {
    setDirty({ ...dirty, [key]: value });
  }

  async function handleSave(key: string) {
    setSaving(true);
    try {
      const s = settings[key];
      await api.settings.setKey(key, { value: dirty[key], category: s?.category || 'general', description: s?.description || '' });
      setSettings({ ...settings, [key]: { ...s, value: dirty[key] } });
      setDirty(prev => { const n = { ...prev }; delete n[key]; return n; });
      if (key === 'language') refreshLanguage();
    } catch (err) { AppAlert.error((err as Error).message); }
    finally { setSaving(false); }
  }

  async function saveAll() {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(dirty)) {
        const s = settings[key];
        await api.settings.setKey(key, { value, category: s?.category || 'general', description: s?.description || '' });
        setSettings(prev => ({ ...prev, [key]: { ...s, value } }));
      }
      setDirty({});
      if ('language' in dirty) refreshLanguage();
      AppAlert.success('Settings saved');
    } catch (err) { AppAlert.error((err as Error).message); }
    finally { setSaving(false); }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const prefs = await api.settings.updateProfile(profile);
      setProfile(prefs);
      AppAlert.success('Profile updated');
    } catch (err) { AppAlert.error((err as Error).message); }
    finally { setSaving(false); }
  }

  const selectOptions: Record<string, { label: string; value: string }[]> = {
    language: [{ label: 'English', value: 'en' }, { label: 'Bahasa Indonesia', value: 'id' }],
    timezone: [
      { label: 'UTC (UTC+0)', value: 'UTC' },
      { label: 'Asia/Jakarta (WIB, UTC+7)', value: 'Asia/Jakarta' },
      { label: 'Asia/Makassar (WITA, UTC+8)', value: 'Asia/Makassar' },
      { label: 'Asia/Jayapura (WIT, UTC+9)', value: 'Asia/Jayapura' },
      { label: 'America/New_York (ET, UTC-5)', value: 'America/New_York' },
      { label: 'America/Chicago (CT, UTC-6)', value: 'America/Chicago' },
      { label: 'America/Denver (MT, UTC-7)', value: 'America/Denver' },
      { label: 'America/Los_Angeles (PT, UTC-8)', value: 'America/Los_Angeles' },
      { label: 'Europe/London (GMT, UTC+0)', value: 'Europe/London' },
      { label: 'Europe/Paris (CET, UTC+1)', value: 'Europe/Paris' },
      { label: 'Europe/Berlin (CET, UTC+1)', value: 'Europe/Berlin' },
      { label: 'Asia/Tokyo (JST, UTC+9)', value: 'Asia/Tokyo' },
      { label: 'Asia/Shanghai (CST, UTC+8)', value: 'Asia/Shanghai' },
      { label: 'Asia/Singapore (SGT, UTC+8)', value: 'Asia/Singapore' },
      { label: 'Asia/Hong_Kong (HKT, UTC+8)', value: 'Asia/Hong_Kong' },
      { label: 'Asia/Seoul (KST, UTC+9)', value: 'Asia/Seoul' },
      { label: 'Asia/Kolkata (IST, UTC+5:30)', value: 'Asia/Kolkata' },
      { label: 'Asia/Dubai (GST, UTC+4)', value: 'Asia/Dubai' },
      { label: 'Australia/Sydney (AEST, UTC+10)', value: 'Australia/Sydney' },
      { label: 'Pacific/Auckland (NZST, UTC+12)', value: 'Pacific/Auckland' },
    ],
  };

  const currentSettings = Object.entries(settings).filter(([, s]) => (s as any).category === activeTab);

  return (
    <div className="p-6 flex gap-6">
      {/* Sidebar tabs */}
      <div className="w-48 flex-shrink-0 space-y-0.5">
        {categories.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${activeTab === id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-white">Settings</h1>
          {(Object.keys(dirty).length > 0 || activeTab === 'general') && (
            <Button onClick={saveAll} loading={saving}>
              <Save size={14} /> Save All
            </Button>
          )}
        </div>

        {/* Profile section */}
        {activeTab === 'general' && (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><User size={14} /> Profile</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500">Display Name</label>
                <Input value={profile.displayName || ''} onChange={e => setProfile({ ...profile, displayName: e.target.value })}
                  placeholder="Your display name" />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Theme</label>
                <select value={profile.theme || 'dark'} onChange={e => setProfile({ ...profile, theme: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200">
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>
              <Button size="sm" onClick={saveProfile} loading={saving}><Save size={12} /> Save Profile</Button>
            </CardContent>
          </Card>
        )}

        {/* Category settings */}
        {currentSettings.map(([key, s]: [string, any]) => (
          <Card key={key} className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</CardTitle>
                {dirty[key] !== undefined && (
                  <Button size="sm" onClick={() => handleSave(key)} loading={saving}>
                    <Save size={10} /> Save
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {s.description && <p className="text-xs text-zinc-500">{s.description}</p>}
              {typeof s.value === 'boolean' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={dirty[key] ?? s.value} onChange={e => setSetting(key, e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800" />
                  <span className="text-xs text-zinc-300">Enabled</span>
                </label>
              ) : typeof s.value === 'number' ? (
                <input type="number" value={dirty[key] ?? s.value}
                  onChange={e => setSetting(key, parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200" />
              ) : selectOptions[key] ? (
                <select value={dirty[key] ?? s.value ?? ''} onChange={e => setSetting(key, e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200">
                  {selectOptions[key].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <Input value={dirty[key] ?? s.value ?? ''} onChange={e => setSetting(key, e.target.value)}
                  placeholder={s.description || s.key} />
              )}
            </CardContent>
          </Card>
        ))}

        {error && <p className="text-sm text-red-400 text-center py-2">{error}</p>}
        {currentSettings.length === 0 && activeTab !== 'general' && (
          <p className="text-sm text-zinc-500 text-center py-8">No settings in this category yet.</p>
        )}
      </div>
    </div>
  );
}
