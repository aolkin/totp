<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card';

  interface Props {
    visible?: boolean;
    onClose?: () => void;
  }

  const { visible = false, onClose }: Props = $props();

  const userAgent = navigator.userAgent.toLowerCase();
  const isIOS =
    userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod');
  const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
  const isFirefox = userAgent.includes('firefox');
  const isMac = userAgent.includes('macintosh') || userAgent.includes('mac os x');

  function getBrowserName(): string {
    if (isIOS) return 'Safari on iOS';
    if (isSafari && isMac) return 'Safari on macOS';
    if (isFirefox) return 'Firefox';
    return 'your browser';
  }

  function handleClose() {
    if (onClose) {
      onClose();
    }
  }

  function handleBackdropClick() {
    handleClose();
  }

  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

{#if visible}
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeydown}
    role="presentation"
  >
    <div
      onclick={(e) => {
        e.stopPropagation();
      }}
      onkeydown={(e) => {
        e.stopPropagation();
      }}
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <Card class="max-w-lg">
        <CardHeader>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">Install This App</h2>
            <button
              onclick={handleClose}
              class="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <p class="text-sm text-muted-foreground mb-4">
            To install this app on {getBrowserName()}, follow these steps:
          </p>

          {#if isIOS}
            <ol class="space-y-3 text-sm">
              <li class="flex gap-2">
                <span class="font-semibold">1.</span>
                <span>Tap the <strong>Share</strong> button (square with arrow pointing up)</span>
              </li>
              <li class="flex gap-2">
                <span class="font-semibold">2.</span>
                <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
              </li>
              <li class="flex gap-2">
                <span class="font-semibold">3.</span>
                <span>Tap <strong>"Add"</strong> in the top right corner</span>
              </li>
            </ol>
          {:else if isSafari && isMac}
            <ol class="space-y-3 text-sm">
              <li class="flex gap-2">
                <span class="font-semibold">1.</span>
                <span>Click <strong>File</strong> in the menu bar</span>
              </li>
              <li class="flex gap-2">
                <span class="font-semibold">2.</span>
                <span>Select <strong>"Add to Dock"</strong></span>
              </li>
            </ol>
            <p class="text-xs text-muted-foreground mt-4">
              Note: macOS Safari has limited PWA support. For the best experience, consider using
              Chrome or Edge.
            </p>
          {:else if isFirefox}
            <ol class="space-y-3 text-sm">
              <li class="flex gap-2">
                <span class="font-semibold">1.</span>
                <span>Click the menu button (three horizontal lines) in the top right</span>
              </li>
              <li class="flex gap-2">
                <span class="font-semibold">2.</span>
                <span
                  >Select <strong>"Install"</strong> or <strong>"Add to Home Screen"</strong></span
                >
              </li>
            </ol>
            <p class="text-xs text-muted-foreground mt-4">
              Note: Firefox has limited PWA support. For the best experience, consider using Chrome
              or Edge.
            </p>
          {:else}
            <p class="text-sm">
              Look for an install button in your browser's address bar or menu, or check your
              browser's documentation for installing Progressive Web Apps.
            </p>
          {/if}

          <div class="mt-6 flex justify-end">
            <Button onclick={handleClose} size="sm">Got It</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
{/if}
