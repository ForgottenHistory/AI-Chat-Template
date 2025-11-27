<script lang="ts">
	import type { Message } from '$lib/server/db/schema';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import MessageControls from './MessageControls.svelte';

	interface Props {
		message: Message;
		index: number;
		isLast: boolean;
		charName: string | undefined;
		userName: string | undefined;
		onSwipe: (direction: 'left' | 'right') => void;
		onDelete: () => void;
	}

	let { message, index, isLast, charName, userName, onSwipe, onDelete }: Props = $props();

	let isUser = $derived(message.role === 'user');
	let showSwipeControls = $derived(message.role === 'assistant' && isLast);
</script>

<div class="group flex {isUser ? 'justify-end' : 'justify-start'}">
	<div class="flex flex-col gap-2 max-w-[70%]">
		<div
			class="rounded-2xl px-4 py-3 {isUser
				? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
				: 'bg-white border border-gray-200 text-gray-900'}"
		>
			<ChatMessage
				content={message.content}
				role={message.role}
				{charName}
				{userName}
			/>
		</div>

		<MessageControls
			{message}
			showSwipe={showSwipeControls}
			align={isUser ? 'end' : 'start'}
			{onSwipe}
			{onDelete}
		/>
	</div>
</div>
