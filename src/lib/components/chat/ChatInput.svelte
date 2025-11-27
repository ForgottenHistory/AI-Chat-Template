<script lang="ts">
	interface Props {
		disabled: boolean;
		hasAssistantMessages: boolean;
		impersonating: boolean;
		onSend: (message: string) => void;
		onGenerate: () => void;
		onRegenerate: () => void;
		onImpersonate: () => void;
	}

	let { disabled, hasAssistantMessages, impersonating, onSend, onGenerate, onRegenerate, onImpersonate }: Props = $props();

	let input = $state('');

	export function setInput(text: string) {
		input = text;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}

	function handleSubmit() {
		if (disabled) return;

		const message = input.trim();
		if (message) {
			onSend(message);
			input = '';
		} else {
			onGenerate();
		}
	}
</script>

<div class="bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] px-6 py-4">
	<div class="max-w-4xl mx-auto flex items-end gap-3">
		<div class="flex items-center">
			<button
				onclick={onImpersonate}
				{disabled}
				class="p-3 text-[var(--text-muted)] hover:text-[var(--accent-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition rounded-lg hover:bg-[var(--bg-tertiary)]"
				title="Impersonate (AI writes as you)"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
				</svg>
			</button>
			<button
				onclick={onRegenerate}
				disabled={disabled || !hasAssistantMessages}
				class="p-3 text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-30 disabled:cursor-not-allowed transition rounded-lg hover:bg-[var(--bg-tertiary)]"
				title="Regenerate last response"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
				</svg>
			</button>
		</div>
		<textarea
			bind:value={input}
			onkeydown={handleKeydown}
			placeholder={impersonating ? "Generating..." : "Type a message..."}
			disabled={impersonating}
			rows="1"
			class="flex-1 px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none disabled:opacity-50"
		></textarea>
		<button
			onclick={handleSubmit}
			{disabled}
			class="px-6 py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
			title={input.trim() ? 'Send message' : 'Generate bot response'}
		>
			{#if input.trim()}
				Send
			{:else}
				Generate
			{/if}
		</button>
	</div>
</div>
