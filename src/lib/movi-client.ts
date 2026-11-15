"use client"
// Movi's programmatic APIs that a page (not the element) uses. Client only.
//
// - registerSourceAdapter(scheme, factory): teach <movi-player> a custom `src` scheme
//   (s3://, ipfs://, a WebSocket / WebRTC / IndexedDB byte source...). The future direct-stream
//   feature can plug its own transport in here.
// - upgradeVideoElements(): take over any plain <video> on a page.
export { registerSourceAdapter, unregisterSourceAdapter, upgradeVideoElements, MoviElement } from 'movi-player/element/slim'
export type { SourceAdapter, MoviControlSpec, QoEEvent } from 'movi-player/element/slim'
