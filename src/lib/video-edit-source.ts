/** Only authoring responses contain editSourceUrl; playback references are not files. */
export function videoEditSource(video: { editSourceUrl?: string | null; videoUrl?: string | null }) {
  const source = video.editSourceUrl || video.videoUrl || '';
  return source.startsWith('pyramidplay:') ? '' : source;
}
