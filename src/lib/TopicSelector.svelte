<script>
  import { TOPICS, getActiveTopics, getLimitedTopics, loadTopicId, saveTopicId, isBrowsableTopicId, prefetchTopicData } from './topics.js';
  import TopicLogo from './TopicLogo.svelte';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';

  /** @type {{ topicId: string, onchange?: (id: string) => void }} */
  let { topicId = $bindable(loadTopicId()), onchange } = $props();

  const active = getActiveTopics();
  const limited = getLimitedTopics();

  const selectedTopic = $derived(TOPICS.find((t) => t.id === topicId));

  function onTopicChange(value) {
    if (!value || !isBrowsableTopicId(value)) return;
    topicId = value;
    saveTopicId(value);
    onchange?.(value);
  }

  function onDropdownOpenChange(open) {
    if (!open) return;
    for (const topic of [...active, ...limited]) prefetchTopicData(topic.id);
  }
</script>

<div class="flex min-w-0 items-center gap-3">
  <Label for="topic-select-trigger" class="text-muted-foreground shrink-0 text-xs uppercase tracking-wide">
    Research topic
  </Label>
  <Select.Root type="single" value={topicId} onValueChange={onTopicChange} onOpenChange={onDropdownOpenChange}>
    <Select.Trigger id="topic-select-trigger" class="w-full min-w-[220px]">
      <span class="flex min-w-0 items-center gap-2">
        {#if selectedTopic}
          <TopicLogo topicMeta={selectedTopic} size={22} />
        {/if}
        <span class="truncate">{selectedTopic?.label ?? 'Select topic'}</span>
      </span>
    </Select.Trigger>
    <Select.Content>
      {#each active as topic}
        <Select.Item value={topic.id} label={topic.label}>
          <span class="flex items-center gap-2">
            <TopicLogo topicMeta={topic} size={20} />
            <span class="truncate">{topic.label}{topic.category ? ' · ' + topic.category : ''}</span>
          </span>
        </Select.Item>
      {/each}
      {#if limited.length}
        <Select.Separator />
        <Select.Group>
          <Select.GroupHeading>Limited SEC disclosure</Select.GroupHeading>
          {#each limited as topic}
            <Select.Item value={topic.id} label={topic.label}>
              <span class="flex items-center gap-2">
                <TopicLogo topicMeta={topic} size={20} />
                <span class="truncate">{topic.label}{topic.shortLabel ? ' (' + topic.shortLabel + ')' : ''}</span>
              </span>
            </Select.Item>
          {/each}
        </Select.Group>
      {/if}
    </Select.Content>
  </Select.Root>
</div>
