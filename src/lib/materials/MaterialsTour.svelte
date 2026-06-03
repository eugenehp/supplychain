<script>
  import * as Card from '$lib/components/ui/card/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Badge } from '$lib/components/ui/badge/index.js';
  import { MATERIALS_TOUR_STEPS } from './materials-sections.js';

  let stepIndex = $state(0);

  const step = $derived(MATERIALS_TOUR_STEPS[stepIndex] ?? MATERIALS_TOUR_STEPS[0]);

  function goToSection() {
    document.getElementById(step.sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function next() {
    stepIndex = (stepIndex + 1) % MATERIALS_TOUR_STEPS.length;
    goToSection();
  }

  function prev() {
    stepIndex = (stepIndex - 1 + MATERIALS_TOUR_STEPS.length) % MATERIALS_TOUR_STEPS.length;
    goToSection();
  }
</script>

<section id="materials-tour" class="ui-section" aria-label="Guided tour">
  <Card.Root class="border-primary/25 bg-primary/5">
    <Card.Header class="pb-2">
      <div class="flex flex-wrap items-center gap-2">
        <Card.Title class="text-base">Guided tour: ore to magnet</Card.Title>
        <Badge variant="secondary" class="text-[10px]">
          Step {stepIndex + 1} / {MATERIALS_TOUR_STEPS.length}
        </Badge>
      </div>
      <Card.Description class="text-sm leading-relaxed">
        {step.body}
      </Card.Description>
    </Card.Header>
    <Card.Content class="flex flex-wrap items-center gap-2 pt-0">
      <Button variant="outline" size="sm" onclick={prev}>Previous</Button>
      <Button size="sm" onclick={next}>Next: {MATERIALS_TOUR_STEPS[(stepIndex + 1) % MATERIALS_TOUR_STEPS.length].title}</Button>
      <Button variant="ghost" size="sm" onclick={goToSection}>Jump to section →</Button>
    </Card.Content>
  </Card.Root>
</section>
