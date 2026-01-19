<script lang="ts">
  import { onMount } from 'svelte';
  import QrScanner from 'qr-scanner';
  import { parseOTPAuthURL, type OTPAuthData } from '../lib/otpauth';
  import { Button } from '$lib/components/ui/button';
  import { Switch } from '$lib/components/ui/switch';
  import { Label } from '$lib/components/ui/label';
  import { Alert, AlertDescription } from '$lib/components/ui/alert';
  import * as Dialog from '$lib/components/ui/dialog';

  interface Props {
    open?: boolean;
    onScan?: (data: OTPAuthData) => void;
  }

  // eslint-disable-next-line prefer-const -- onScan is not reassigned but destructured with bindable open
  let { open = $bindable(false), onScan }: Props = $props();

  let videoElement = $state<HTMLVideoElement | undefined>();
  let qrScanner = $state<QrScanner | undefined>();
  let error = $state<string | undefined>();
  let scanning = $state(true);
  let useFrontCamera = $state(false);
  let hasMultipleCameras = $state(false);

  async function checkCameraCount(): Promise<void> {
    try {
      const cameras = await QrScanner.listCameras(true);
      hasMultipleCameras = cameras.length > 1;
    } catch {
      hasMultipleCameras = false;
    }
  }

  async function startScanner(): Promise<void> {
    if (!videoElement) return;

    error = undefined;

    try {
      qrScanner = new QrScanner(
        videoElement,
        (result) => {
          handleQRCodeDetected(result.data);
        },
        {
          preferredCamera: useFrontCamera ? 'user' : 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 10,
        },
      );

      await qrScanner.start();
      scanning = true;
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          error = 'Camera permission denied. Please allow camera access in your browser settings.';
        } else if (err.name === 'NotFoundError') {
          error = 'No camera found. Please connect a camera and try again.';
        } else if (err.name === 'NotReadableError') {
          error = 'Camera is in use by another application.';
        } else {
          error = `Camera access failed: ${err.message}`;
        }
      } else {
        error = 'Failed to start camera. Please try again.';
      }
      scanning = false;
    }
  }

  function stopScanner(): void {
    if (qrScanner) {
      qrScanner.stop();
      qrScanner.destroy();
      qrScanner = undefined;
    }
    scanning = false;
  }

  function handleQRCodeDetected(data: string): void {
    if (!scanning) return;

    try {
      const parsed = parseOTPAuthURL(data);
      stopScanner();
      onScan?.(parsed);
      open = false;
    } catch (err) {
      console.warn('QR scan failed for URL:', data);
      if (err instanceof Error) {
        // Strip "Invalid URL: " prefix from error messages for cleaner user display
        if (err.message.includes('Invalid URL')) {
          error = err.message.replace('Invalid URL: ', '');
        } else {
          error = 'Not a valid TOTP QR code. Please scan a TOTP authenticator QR code.';
        }
      }
    }
  }

  async function toggleCamera(): Promise<void> {
    useFrontCamera = !useFrontCamera;
    stopScanner();
    await startScanner();
  }

  $effect(() => {
    if (open) {
      checkCameraCount().catch(() => {
        hasMultipleCameras = false;
      });
      startScanner().catch(() => {
        error = 'Failed to initialize camera';
        scanning = false;
      });
    } else {
      stopScanner();
    }
  });

  onMount(() => {
    return () => {
      stopScanner();
    };
  });
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-lg" showCloseButton={false}>
    <Dialog.Header>
      <Dialog.Title>Scan QR Code</Dialog.Title>
      <Dialog.Description>Point your camera at a TOTP authenticator QR code</Dialog.Description>
    </Dialog.Header>
    <div class="flex flex-col items-center gap-4">
      <div class="relative w-full max-w-md overflow-hidden rounded-lg bg-black">
        <video bind:this={videoElement} class="w-full aspect-square object-cover" playsinline muted
        ></video>

        {#if scanning && !error}
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-48 h-48 border-2 border-white/50 rounded-lg animate-pulse"></div>
          </div>
        {/if}
      </div>

      {#if error}
        <Alert variant="destructive" class="w-full max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onclick={startScanner} variant="secondary">Try Again</Button>
      {:else}
        <p class="text-sm text-muted-foreground text-center">Point your camera at a TOTP QR code</p>
      {/if}

      {#if hasMultipleCameras && !error}
        <div class="flex items-center gap-2">
          <Switch id="camera-toggle" checked={useFrontCamera} onCheckedChange={toggleCamera} />
          <Label for="camera-toggle" class="text-sm cursor-pointer">
            {useFrontCamera ? 'Front camera' : 'Rear camera'}
          </Label>
        </div>
      {/if}

      <Dialog.Close
        onclick={stopScanner}
        class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full max-w-md"
      >
        Cancel
      </Dialog.Close>
    </div>
  </Dialog.Content>
</Dialog.Root>
