import { useState, useEffect } from 'react';
import { Save, RotateCcw, Loader2 } from 'lucide-react';
import { useConfig, useUpdateConfig } from '../../api/config';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

export function SettingsPanel() {
  const { data: config, isLoading, error } = useConfig();
  const updateConfig = useUpdateConfig();

  // Local state for form
  const [maxDepth, setMaxDepth] = useState(5);
  const [fetchDelay, setFetchDelay] = useState(1000);
  const [followThreshold, setFollowThreshold] = useState(0.4);
  const [discoveryThreshold, setDiscoveryThreshold] = useState(0.6);
  const [maxOpenThreads, setMaxOpenThreads] = useState(50);
  const [decayDays, setDecayDays] = useState(14);
  const [blockedDomains, setBlockedDomains] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Load config into form
  useEffect(() => {
    if (config) {
      setMaxDepth(config.exploration.max_depth);
      setFetchDelay(config.exploration.fetch_delay_ms);
      setFollowThreshold(config.interestingness.follow_threshold);
      setDiscoveryThreshold(config.interestingness.discovery_threshold);
      setMaxOpenThreads(config.threads.max_open);
      setDecayDays(config.threads.decay_days);
      setBlockedDomains(config.sources.web.blocked_domains.join('\n'));
      setHasChanges(false);
    }
  }, [config]);

  const handleSave = () => {
    updateConfig.mutate({
      exploration: {
        max_depth: maxDepth,
        max_breadth: 1,
        source_timeout_ms: 30000,
        fetch_delay_ms: fetchDelay,
      },
      interestingness: {
        weights: config?.interestingness.weights ?? {
          novelty: 0.3,
          connection_potential: 0.25,
          explanatory_power: 0.2,
          contradiction: 0.15,
          generativity: 0.1,
        },
        follow_threshold: followThreshold,
        discovery_threshold: discoveryThreshold,
      },
      threads: {
        max_open: maxOpenThreads,
        decay_days: decayDays,
        revisit_probability: config?.threads.revisit_probability ?? 0.1,
      },
      sources: {
        web: {
          enabled: true,
          blocked_domains: blockedDomains.split('\n').map(d => d.trim()).filter(Boolean),
          respect_robots: true,
        },
      },
    }, {
      onSuccess: () => setHasChanges(false),
    });
  };

  const handleReset = () => {
    if (config) {
      setMaxDepth(config.exploration.max_depth);
      setFetchDelay(config.exploration.fetch_delay_ms);
      setFollowThreshold(config.interestingness.follow_threshold);
      setDiscoveryThreshold(config.interestingness.discovery_threshold);
      setMaxOpenThreads(config.threads.max_open);
      setDecayDays(config.threads.decay_days);
      setBlockedDomains(config.sources.web.blocked_domains.join('\n'));
      setHasChanges(false);
    }
  };

  const markChanged = () => setHasChanges(true);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading settings...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-danger">
        Failed to load settings
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-text">Settings</h1>
          {hasChanges && (
            <span className="text-sm text-warn">Unsaved changes</span>
          )}
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-medium text-text">Exploration</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1">Max Depth</label>
              <input
                type="number"
                value={maxDepth}
                onChange={(e) => { setMaxDepth(parseInt(e.target.value) || 1); markChanged(); }}
                min={1}
                max={10}
                className="bg-bg border border-border rounded px-3 py-2 w-24 text-text"
              />
              <p className="text-xs text-muted mt-1">How deep to follow threads (1-10)</p>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Fetch Delay (ms)</label>
              <input
                type="number"
                value={fetchDelay}
                onChange={(e) => { setFetchDelay(parseInt(e.target.value) || 500); markChanged(); }}
                min={500}
                max={5000}
                step={100}
                className="bg-bg border border-border rounded px-3 py-2 w-24 text-text"
              />
              <p className="text-xs text-muted mt-1">Delay between requests (500-5000ms)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-medium text-text">Evaluation Thresholds</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1">
                Follow Threshold: {followThreshold.toFixed(2)}
              </label>
              <input
                type="range"
                value={followThreshold}
                onChange={(e) => { setFollowThreshold(parseFloat(e.target.value)); markChanged(); }}
                min={0}
                max={1}
                step={0.05}
                className="w-full"
              />
              <p className="text-xs text-muted mt-1">Minimum score to follow a thread</p>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">
                Discovery Threshold: {discoveryThreshold.toFixed(2)}
              </label>
              <input
                type="range"
                value={discoveryThreshold}
                onChange={(e) => { setDiscoveryThreshold(parseFloat(e.target.value)); markChanged(); }}
                min={0}
                max={1}
                step={0.05}
                className="w-full"
              />
              <p className="text-xs text-muted mt-1">Minimum score to save as discovery</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-medium text-text">Thread Pool</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-muted mb-1">Max Open Threads</label>
              <input
                type="number"
                value={maxOpenThreads}
                onChange={(e) => { setMaxOpenThreads(parseInt(e.target.value) || 10); markChanged(); }}
                min={10}
                max={200}
                className="bg-bg border border-border rounded px-3 py-2 w-24 text-text"
              />
              <p className="text-xs text-muted mt-1">Maximum pending threads to keep (10-200)</p>
            </div>

            <div>
              <label className="block text-sm text-muted mb-1">Decay Days</label>
              <input
                type="number"
                value={decayDays}
                onChange={(e) => { setDecayDays(parseInt(e.target.value) || 1); markChanged(); }}
                min={1}
                max={90}
                className="bg-bg border border-border rounded px-3 py-2 w-24 text-text"
              />
              <p className="text-xs text-muted mt-1">Days before a thread decays (1-90)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-medium text-text">Blocked Domains</h2>
          </CardHeader>
          <CardContent>
            <textarea
              value={blockedDomains}
              onChange={(e) => { setBlockedDomains(e.target.value); markChanged(); }}
              placeholder="One domain per line..."
              className="
                w-full bg-bg border border-border rounded px-3 py-2 text-text
                placeholder-muted min-h-[100px] resize-none font-mono text-sm
                focus:outline-none focus:border-accent
              "
            />
            <p className="text-xs text-muted mt-1">Domains to skip during exploration</p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pb-6">
          <Button
            variant="ghost"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateConfig.isPending}
          >
            {updateConfig.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
