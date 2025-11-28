<script lang="ts">
	import type { PageData } from './$types';
	import type { Character, Message } from '$lib/server/db/schema';
	import MainLayout from '$lib/components/MainLayout.svelte';
	import ChatHeader from '$lib/components/chat/ChatHeader.svelte';
	import ChatMessages from '$lib/components/chat/ChatMessages.svelte';
	import ChatInput from '$lib/components/chat/ChatInput.svelte';
	import ImageGenerateModal from '$lib/components/chat/ImageGenerateModal.svelte';
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

	// Character image visibility
	let showCharacterImage = $state(true);

	let character = $state<Character | null>(null);
	let messages = $state<Message[]>([]);
	let loading = $state(true);
	let sending = $state(false);
	let regenerating = $state(false);
	let impersonating = $state(false);
	let generatingImage = $state(false);
	let generatingSD = $state(false);
	let conversationId = $state<number | null>(null);
	let isTyping = $state(false);

	// Image generation modal state
	let showImageModal = $state(false);
	let imageModalLoading = $state(false);
	let imageModalTags = $state('');
	let imageModalType = $state<'character' | 'user' | 'scene'>('character');
	let chatMessages: ChatMessages;
	let chatInput: ChatInput;
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

	async function impersonate() {
		if (sending || impersonating) return;
		impersonating = true;

		try {
			const response = await fetch(`/api/chat/${data.characterId}/impersonate`, {
				method: 'POST'
			});

			if (response.ok) {
				const result = await response.json();
				chatInput?.setInput(result.content);
			} else {
				alert('Failed to impersonate');
			}
		} catch (error) {
			console.error('Failed to impersonate:', error);
		} finally {
			impersonating = false;
		}
	}

	async function generateImage(type: 'character' | 'user' | 'scene') {
		if (generatingImage || !conversationId) return;

		// Open modal and start loading
		imageModalType = type;
		imageModalTags = '';
		showImageModal = true;
		imageModalLoading = true;
		generatingImage = true;

		try {
			const response = await fetch(`/api/chat/${data.characterId}/generate-image`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type })
			});

			if (response.ok) {
				const result = await response.json();
				imageModalTags = result.tags;
			} else {
				const error = await response.json();
				alert(`Failed to generate tags: ${error.error || 'Unknown error'}`);
				showImageModal = false;
			}
		} catch (error) {
			console.error('Failed to generate tags:', error);
			alert('Failed to generate tags');
			showImageModal = false;
		} finally {
			imageModalLoading = false;
			generatingImage = false;
		}
	}

	async function handleImageGenerate(tags: string) {
		if (generatingSD) return;
		generatingSD = true;

		try {
			const response = await fetch(`/api/chat/${data.characterId}/generate-sd`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tags })
			});

			if (response.ok) {
				// Message will arrive via Socket.IO
				showImageModal = false;
				imageModalTags = '';
				setTimeout(() => chatMessages?.scrollToBottom(), 100);
			} else {
				const error = await response.json();
				alert(`Failed to generate image: ${error.error || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('Failed to generate image:', error);
			alert('Failed to generate image');
		} finally {
			generatingSD = false;
		}
	}

	function handleImageCancel() {
		imageModalTags = '';
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
		const messageIndex = messages.findIndex(m => m.id === messageId);
		if (messageIndex === -1) return;

		regenerating = true; // Disable message controls while generating

		try {
			const response = await fetch(`/api/chat/messages/${messageId}/regenerate`, {
				method: 'POST'
			});

			if (response.ok) {
				const result = await response.json();
				// Update message locally with new content and swipe count
				const message = messages[messageIndex];
				const swipes = getSwipes(message);
				swipes.push(result.content);

				messages[messageIndex] = {
					...message,
					content: result.content,
					swipes: JSON.stringify(swipes),
					currentSwipe: swipes.length - 1
				};
				messages = [...messages];
			} else {
				alert('Failed to regenerate message');
			}
		} catch (error) {
			console.error('Failed to regenerate message:', error);
			alert('Failed to regenerate message');
		} finally {
			regenerating = false;
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
	<div class="h-full flex flex-col bg-[var(--bg-primary)]">
		<ChatHeader
			{character}
			onReset={resetConversation}
			onBack={() => window.location.href = '/library'}
		/>

		<!-- Chat Area with Character Image -->
		<div class="flex-1 flex min-h-0 gap-4 p-4">
			<!-- Left Side: Character Image -->
			{#if character && showCharacterImage}
				<div class="relative w-80 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-[var(--border-primary)] hidden lg:block group transition-all duration-300">
					{#if character.imageData}
						<img
							src={character.imageData}
							alt={character.name}
							class="w-full h-full object-cover object-center"
						/>
					{:else}
						<div class="w-full h-full flex items-center justify-center text-[var(--text-muted)] bg-[var(--bg-tertiary)]">
							<svg class="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
						</div>
					{/if}
					<!-- Top gradient fade -->
					<div class="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/40 via-black/20 to-transparent"></div>
					<!-- Side gradient for blending -->
					<div class="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[var(--bg-primary)]/20"></div>
					<!-- Subtle vignette -->
					<div class="absolute inset-0" style="box-shadow: inset 0 0 80px rgba(0,0,0,0.15)"></div>

					<!-- Hide button (top right, shows on hover) -->
					<button
						onclick={() => (showCharacterImage = false)}
						class="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-lg transition-all opacity-0 group-hover:opacity-100"
						title="Hide character image"
					>
						<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
						</svg>
					</button>

					<!-- Character name overlay at bottom -->
					<div class="absolute bottom-0 left-0 right-0 h-24">
						<!-- Blur layer with gradual fade -->
						<div class="absolute inset-0 backdrop-blur-sm" style="mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%); -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%)"></div>
						<!-- Dark gradient -->
						<div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
						<!-- Name text -->
						<div class="absolute bottom-4 left-4 right-4">
							<h2 class="text-lg font-bold text-white drop-shadow-lg">{character.name}</h2>
						</div>
					</div>
				</div>
			{/if}

			<!-- Show Image Button (when hidden) -->
			{#if character && !showCharacterImage}
				<button
					onclick={() => (showCharacterImage = true)}
					class="w-12 flex-shrink-0 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl shadow-lg hover:bg-[var(--bg-tertiary)] transition-all hidden lg:flex items-center justify-center"
					title="Show character image"
				>
					<svg class="w-6 h-6 text-[var(--accent-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
					</svg>
				</button>
			{/if}

			<!-- Messages Area -->
			<ChatMessages
				bind:this={chatMessages}
				{messages}
				{loading}
				{isTyping}
				generating={regenerating}
				charName={character?.name}
				userName={data.user?.displayName}
				onSwipe={swipeMessage}
				onSaveEdit={saveMessageEdit}
				onDelete={deleteMessageAndBelow}
			/>
		</div>

		<ChatInput
			bind:this={chatInput}
			disabled={sending || regenerating}
			{hasAssistantMessages}
			{impersonating}
			{generatingImage}
			onSend={sendMessage}
			onGenerate={generateResponse}
			onRegenerate={regenerateLastMessage}
			onImpersonate={impersonate}
			onGenerateImage={generateImage}
		/>
	</div>
</MainLayout>

<ImageGenerateModal
	bind:show={showImageModal}
	loading={imageModalLoading}
	generating={generatingSD}
	tags={imageModalTags}
	type={imageModalType}
	onGenerate={handleImageGenerate}
	onCancel={handleImageCancel}
/>
