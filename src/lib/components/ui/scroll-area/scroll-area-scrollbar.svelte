<script>
	import { ScrollArea as ScrollAreaPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		orientation = "vertical",
		children,
		...restProps
	} = $props();
</script>

<ScrollAreaPrimitive.Scrollbar
	bind:ref
	data-slot="scroll-area-scrollbar"
	data-orientation={orientation}
	{orientation}
	class={cn(
		"data-horizontal:h-3 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-3 data-vertical:border-l data-vertical:border-l-transparent bg-muted/50 flex touch-none p-0.5 transition-colors select-none",
		className
	)}
	{...restProps}
>
	{@render children?.()}
	<ScrollAreaPrimitive.Thumb
		data-slot="scroll-area-thumb"
		class="bg-muted-foreground/45 hover:bg-muted-foreground/65 relative flex-1 rounded-full transition-colors"
	/>
</ScrollAreaPrimitive.Scrollbar>