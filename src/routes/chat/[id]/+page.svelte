<script lang="ts">
	import type { PageData } from './$types';
	import type { Character, Message } from '$lib/server/db/schema';
	import MainLayout from '$lib/components/MainLayout.svelte';
	import ChatHeader from '$lib/components/chat/ChatHeader.svelte';
	import ChatMessages from '$lib/components/chat/ChatMessages.svelte';
	import ChatInput from '$lib/components/chat/ChatInput.svelte';
	import { onMount, onDestroy } from 'svelte';
	import {
		initSocket,
		joinConversation,
		leaveConversation,
		onNewMessage,
		onTyping,
		removeAllListeners
	} from '$lib/stores/socket';

	let { data }: { data: PageData } = $props();

	let character = $state<Character | null>(null);
	let messages = $state<Message[]>([]);
	let loading = $state(true);
	let sending = $state(false);
	let conversationId = $state<number | null>(null);
	let isTyping = $state(false);
	let chatMessages: ChatMessages;
	let previousCharacterId: number | null = null;

	let hasAssistantMessages = $derived(messages.some(m => m.role === 'assistant'));

	onMount(() => {
		initSocket();

		onNewMessage((message: Message) => {
			if (!messages.find((m) => m.id === message.id)) {
				messages = [...messages, message];
				setTimeout(() => chatMessages?.scrollToBottom(), 100);
			}
		});

		onTyping((typing: boolean) => {
			isTyping = typing;
			if (typing) {
				setTimeout(() => chatMessages?.scrollToBottom(), 100);
			}
		});

		// Arrow key swipe navigation
		const handleKeydown = (e: KeyboardEvent) => {
			const activeElement = document.activeElement;
			if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
				return;
			}

			const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
			if (!lastAssistantMessage) return;

			if (e.key === 'ArrowLeft') {
				e.preventDefault();
				swipeMessage(lastAssistantMessage.id, 'left');
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				swipeMessage(lastAssistantMessage.id, 'right');
			}
		};

		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});

	$effect(() => {
		const currentCharacterId = data.characterId;
		if (currentCharacterId !== previousCharacterId) {
			if (conversationId) {
				leaveConversation(conversationId);
			}
			previousCharacterId = currentCharacterId;
			loadCharacter();
			loadConversation();
		}
	});

	onDestroy(() => {
		if (conversationId) {
			leaveConversation(conversationId);
		}
		removeAllListeners();
	});

	async function loadCharacter() {
		try {
			const response = await fetch(`/api/characters/${data.characterId}`);
			const result = await response.json();
			character = result.character;
		} catch (error) {
			console.error('Failed to load character:', error);
		}
	}

	async function loadConversation() {
		loading = true;
		try {
			const response = await fetch(`/api/chat/${data.characterId}`);
			const result = await response.json();
			conversationId = result.conversationId;
			messages = result.messages || [];

			if (conversationId) {
				joinConversation(conversationId);
			}

			setTimeout(() => chatMessages?.scrollToBottom(), 100);
		} catch (error) {
			console.error('Failed to load conversation:', error);
		} finally {
			loading = false;
		}
	}

	async function sendMessage(userMessage: string) {
		if (sending) return;
		sending = true;

		try {
			const response = await fetch(`/api/chat/${data.characterId}/send`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: userMessage })
			});

			if (!response.ok) {
				alert('Failed to send message');
			}
		} catch (error) {
			console.error('Failed to send message:', error);
		} finally {
			sending = false;
		}
	}

	async function generateResponse() {
		if (sending) return;
		sending = true;

		try {
			const response = await fetch(`/api/chat/${data.characterId}/generate`, {
				method: 'POST'
			});

			if (!response.ok) {
				alert('Failed to generate response');
			}
		} catch (error) {
			console.error('Failed to generate response:', error);
		} finally {
			sending = false;
		}
	}

	async function resetConversation() {
		if (!conversationId) return;

		const confirmed = confirm('Are you sure you want to reset this conversation? All messages will be deleted.');
		if (!confirmed) return;

		try {
			const response = await fetch(`/api/chat/${conversationId}/reset`, {
				method: 'POST'
			});

			if (response.ok) {
				await loadConversation();
			} else {
				alert('Failed to reset conversation');
			}
		} catch (error) {
			console.error('Failed to reset conversation:', error);
			alert('Failed to reset conversation');
		}
	}

	function getSwipes(message: Message): string[] {
		if (!message.swipes) return [message.content];
		try {
			const swipes = JSON.parse(message.swipes);
			return Array.isArray(swipes) ? swipes : [message.content];
		} catch {
			return [message.content];
		}
	}

	function getCurrentSwipeIndex(message: Message): number {
		return message.currentSwipe ?? 0;
	}

	async function swipeMessage(messageId: number, direction: 'left' | 'right') {
		const messageIndex = messages.findIndex(m => m.id === messageId);
		if (messageIndex === -1) return;

		const message = messages[messageIndex];
		const swipes = getSwipes(message);
		const currentIndex = getCurrentSwipeIndex(message);
		const isFirstMessage = messageIndex === 0;

		if (direction === 'right') {
			const nextIndex = currentIndex + 1;

			if (nextIndex < swipes.length) {
				await updateSwipeIndex(messageId, messageIndex, message, swipes, nextIndex);
			} else if (!isFirstMessage) {
				await regenerateMessage(messageId);
			} else {
				await updateSwipeIndex(messageId, messageIndex, message, swipes, 0);
			}
		} else {
			let newIndex = currentIndex - 1;
			if (newIndex < 0) {
				newIndex = swipes.length - 1;
			}
			await updateSwipeIndex(messageId, messageIndex, message, swipes, newIndex);
		}
	}

	async function updateSwipeIndex(messageId: number, messageIndex: number, message: Message, swipes: string[], newIndex: number) {
		try {
			const response = await fetch(`/api/chat/messages/${messageId}/swipe`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ swipeIndex: newIndex })
			});

			if (response.ok) {
				const updatedMessage = {
					...message,
					content: swipes[newIndex],
					currentSwipe: newIndex
				};
				messages[messageIndex] = updatedMessage;
				messages = [...messages];
			}
		} catch (error) {
			console.error('Failed to swipe message:', error);
		}
	}

	async function regenerateMessage(messageId: number) {
		try {
			const response = await fetch(`/api/chat/messages/${messageId}/regenerate`, {
				method: 'POST'
			});

			if (response.ok) {
				await loadConversation();
			} else {
				alert('Failed to regenerate message');
			}
		} catch (error) {
			console.error('Failed to regenerate message:', error);
			alert('Failed to regenerate message');
		}
	}

	async function regenerateLastMessage() {
		const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
		if (!lastAssistantMessage) return;

		const confirmed = confirm('This will delete all existing variants and generate a fresh response. Continue?');
		if (!confirmed) return;

		try {
			const response = await fetch(`/api/chat/messages/${lastAssistantMessage.id}/regenerate-fresh`, {
				method: 'POST'
			});

			if (response.ok) {
				await loadConversation();
			} else {
				alert('Failed to regenerate message');
			}
		} catch (error) {
			console.error('Failed to regenerate message:', error);
			alert('Failed to regenerate message');
		}
	}

	async function deleteMessageAndBelow(messageId: number, messageIndex: number) {
		const messagesBelow = messages.length - messageIndex;
		const confirmed = confirm(`Delete this message and ${messagesBelow > 1 ? `${messagesBelow - 1} message(s) below it` : 'no messages below'}?`);
		if (!confirmed) return;

		try {
			const response = await fetch(`/api/chat/messages/${messageId}/delete`, {
				method: 'DELETE'
			});

			if (response.ok) {
				messages = messages.slice(0, messageIndex);
			} else {
				alert('Failed to delete messages');
			}
		} catch (error) {
			console.error('Failed to delete messages:', error);
			alert('Failed to delete messages');
		}
	}

	async function saveMessageEdit(messageId: number, messageIndex: number, content: string) {
		try {
			const response = await fetch(`/api/chat/messages/${messageId}/edit`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content })
			});

			if (response.ok) {
				const result = await response.json();
				messages[messageIndex] = result.message;
				messages = [...messages];
			} else {
				alert('Failed to save edit');
			}
		} catch (error) {
			console.error('Failed to save edit:', error);
			alert('Failed to save edit');
		}
	}
</script>

<svelte:head>
	<title>{character?.name ?? 'Chat'} | AI Chat</title>
</svelte:head>

<MainLayout user={data.user} currentPath="/chat">
	<div class="h-full flex flex-col bg-gray-50">
		<ChatHeader
			{character}
			onReset={resetConversation}
			onBack={() => window.location.href = '/library'}
		/>

		<ChatMessages
			bind:this={chatMessages}
			{messages}
			{loading}
			{isTyping}
			charName={character?.name}
			userName={data.user?.displayName}
			onSwipe={swipeMessage}
			onSaveEdit={saveMessageEdit}
			onDelete={deleteMessageAndBelow}
		/>

		<ChatInput
			disabled={sending}
			{hasAssistantMessages}
			onSend={sendMessage}
			onGenerate={generateResponse}
			onRegenerate={regenerateLastMessage}
		/>
	</div>
</MainLayout>
