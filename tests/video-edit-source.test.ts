import { test } from 'node:test';
import assert from 'node:assert/strict';
import { videoEditSource } from '../src/lib/video-edit-source.ts';

test('opens the authorized HLS source instead of the public playback reference', () => {
  assert.equal(videoEditSource({ videoUrl: 'pyramidplay:video:one', editSourceUrl: 'https://media.pyramidplay.cm/videos/hls/one/master.m3u8' }), 'https://media.pyramidplay.cm/videos/hls/one/master.m3u8');
});
test('does not send unresolved protected references to FFmpeg inspection', () => {
  assert.equal(videoEditSource({ videoUrl: 'pyramidplay:video:one' }), '');
  assert.equal(videoEditSource({ videoUrl: '/videos/old.mp4' }), '/videos/old.mp4');
});
