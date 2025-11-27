<script lang="ts">
	interface Props {
		disabled: boolean;
		hasAssistantMessages: boolean;
		onSend: (message: string) => void;
		onGenerate: () => void;
		onRegenerate: () => void;
	}

	let { disabled, hasAssistantMessages, onSend, onGenerate, onRegenerate }: Props = $props();

	let input = $state('');

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

<div class="bg-white border-t border-gray-200 px-6 py-4">
	<div class="max-w-4xl mx-auto flex items-end gap-3">
		<button
			onclick={onRegenerate}
			disabled={!hasAssistantMessages}
			class="p-3 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition rounded-lg hover:bg-gray-100"
			title="Regenerate last response"
		>
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
			</svg>
		</button>
		<textarea
			bind:value={input}
			onkeydown={handleKeydown}
			placeholder="Type a message..."
			rows="1"
			class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
			{disabled}
		></textarea>
		<button
			onclick={handleSubmit}
			{disabled}
			class="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
			title={input.trim() ? 'Send message' : 'Generate bot response'}
		>
			{#if disabled}
				Sending...
			{:else if input.trim()}
				Send
			{:else}
				Generate
			{/if}
		</button>
	</div>
</div>
