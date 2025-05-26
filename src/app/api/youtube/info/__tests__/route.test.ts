// src/app/api/youtube/info/__tests__/route.test.ts
import { POST } from '../route'; // Adjust path as necessary
import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http'; // Or your preferred mocking library

// Mock play-dl
jest.mock('play-dl', () => ({
  validate: jest.fn(),
  video_info: jest.fn(),
  playlist_info: jest.fn(),
}));

// Mock smartErrorMessages
jest.mock('@/ai/flows/smart-error-messages', () => ({
  smartErrorMessages: jest.fn(),
}));

// Import the mocked instances to configure their behavior in tests
const playdl = require('play-dl');
const smartErrorMessagesMock = require('@/ai/flows/smart-error-messages').smartErrorMessages;


describe('/api/youtube/info POST endpoint', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Default mock implementations
    smartErrorMessagesMock.mockResolvedValue({ feedback: "Default AI feedback." });
  });

  it('should return 400 for an invalid request body (missing URL)', async () => {
    const { req } = createMocks({
      method: 'POST',
      json: () => Promise.resolve({}), // Empty body
    });

    const response = await POST(req as unknown as NextRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(400);
    expect(jsonResponse.error).toEqual('URL is required and must be a string.');
  });
  
  it('should return 400 for an invalid JSON payload', async () => {
    const req = new NextRequest('http://localhost/api/youtube/info', {
        method: 'POST',
        body: 'not a json', // Invalid JSON
        headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    const jsonResponse = await response.json();
    expect(response.status).toBe(400);
    expect(jsonResponse.error).toEqual('Invalid JSON payload.');
  });


  it('should return video info for a valid video URL', async () => {
    const videoUrl = 'https://www.youtube.com/watch?v=validVideoId';
    playdl.validate.mockResolvedValue('video');
    const mockVideoDetails = {
      id: 'validVideoId',
      title: 'Test Video',
      durationInSec: 180,
      channel: { name: 'Test Channel', url: 'channelUrl', id: 'channelId' },
      thumbnails: [{ url: 'thumbnail.jpg', width: 480, height: 360 }],
    };
    const mockVideoFormats = [
      { itag: 22, mimeType: 'video/mp4; codecs="avc1.64001F, mp4a.40.2"', qualityLabel: '720p', fps: 30, hasVideo: true, hasAudio: true, bitrate: 2000, url: 'videoUrl720p' },
      { itag: 140, mimeType: 'audio/mp4; codecs="mp4a.40.2"', audioBitrate: 128, hasVideo: false, hasAudio: true, bitrate: 128, url: 'audioUrl128kbps' },
    ];
    playdl.video_info.mockResolvedValue({ 
        video_details: mockVideoDetails, 
        format: mockVideoFormats 
    });

    const { req } = createMocks({
      method: 'POST',
      json: () => Promise.resolve({ url: videoUrl }),
    });

    const response = await POST(req as unknown as NextRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(200);
    expect(jsonResponse.type).toBe('video');
    expect(jsonResponse.videoInfo.id).toBe('validVideoId');
    expect(jsonResponse.videoInfo.title).toBe('Test Video');
    expect(jsonResponse.videoInfo.author.name).toBe('Test Channel');
    expect(jsonResponse.videoInfo.formats.video.length).toBeGreaterThan(0);
    expect(jsonResponse.videoInfo.formats.audio.length).toBeGreaterThan(0);
    expect(playdl.validate).toHaveBeenCalledWith(videoUrl);
    expect(playdl.video_info).toHaveBeenCalledWith(videoUrl);
  });

  it('should return playlist info for a valid playlist URL', async () => {
    const playlistUrl = 'https://www.youtube.com/playlist?list=validPlaylistId';
    playdl.validate.mockResolvedValue('playlist');
    const mockPlaylistVideos = [
      { id: 'vid1', title: 'Video 1', durationInSec: 120, channel: { name: 'Channel 1' } },
      { id: 'vid2', title: 'Video 2', durationInSec: 240, channel: { name: 'Channel 2' } },
    ];
    playdl.playlist_info.mockResolvedValue({
      title: 'Test Playlist',
      channel: { name: 'Playlist Author', url: 'playlistAuthorUrl' },
      total_videos: 2,
      all_videos: jest.fn().mockResolvedValue(mockPlaylistVideos), // Mock the method on the instance
    });
    
    const { req } = createMocks({
      method: 'POST',
      json: () => Promise.resolve({ url: playlistUrl }),
    });

    const response = await POST(req as unknown as NextRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(200);
    expect(jsonResponse.type).toBe('playlist');
    expect(jsonResponse.playlistInfo.title).toBe('Test Playlist');
    expect(jsonResponse.playlistInfo.author.name).toBe('Playlist Author');
    expect(jsonResponse.playlistInfo.itemCount).toBe(2);
    expect(jsonResponse.playlistInfo.videos.length).toBe(2);
    expect(jsonResponse.playlistInfo.videos[0].title).toBe('Video 1');
    expect(playdl.validate).toHaveBeenCalledWith(playlistUrl);
    expect(playdl.playlist_info).toHaveBeenCalledWith(playlistUrl, { incomplete: false });
  });

  it('should return 400 for an invalid YouTube URL (validation fails)', async () => {
    const invalidUrl = 'https://www.example.com';
    playdl.validate.mockResolvedValue(null); // Or 'false', or any non-'video'/'playlist' type
    smartErrorMessagesMock.mockResolvedValue({ feedback: "This URL is not a valid YouTube link." });

    const { req } = createMocks({
      method: 'POST',
      json: () => Promise.resolve({ url: invalidUrl }),
    });

    const response = await POST(req as unknown as NextRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(400);
    expect(jsonResponse.error).toEqual('Invalid or unsupported YouTube URL.');
    expect(jsonResponse.details).toBe("This URL is not a valid YouTube link.");
    expect(playdl.validate).toHaveBeenCalledWith(invalidUrl);
    expect(smartErrorMessagesMock).toHaveBeenCalledWith({ url: invalidUrl });
  });

  it('should return 404 when video info is not found (e.g., private/deleted video)', async () => {
    const privateVideoUrl = 'https://www.youtube.com/watch?v=privateVideoId';
    playdl.validate.mockResolvedValue('video');
    playdl.video_info.mockRejectedValue(new Error('Video unavailable')); // Simulate play-dl error
    smartErrorMessagesMock.mockResolvedValue({ feedback: "This video is private or deleted." });

    const { req } = createMocks({
      method: 'POST',
      json: () => Promise.resolve({ url: privateVideoUrl }),
    });

    const response = await POST(req as unknown as NextRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(404); // Based on current error handling for "unavailable"
    expect(jsonResponse.error).toContain('Video or playlist is unavailable');
    expect(jsonResponse.details).toBe("This video is private or deleted.");
    expect(playdl.validate).toHaveBeenCalledWith(privateVideoUrl);
    expect(playdl.video_info).toHaveBeenCalledWith(privateVideoUrl);
    expect(smartErrorMessagesMock).toHaveBeenCalledWith({ url: privateVideoUrl });
  });
  
  it('should return 500 if play-dl video_info fails unexpectedly', async () => {
    const videoUrl = 'https://www.youtube.com/watch?v=genericErrorVideo';
    playdl.validate.mockResolvedValue('video');
    playdl.video_info.mockRejectedValue(new Error('Some other unexpected error'));
    smartErrorMessagesMock.mockResolvedValue({ feedback: "An unexpected issue occurred." });

    const { req } = createMocks({
      method: 'POST',
      json: () => Promise.resolve({ url: videoUrl }),
    });

    const response = await POST(req as unknown as NextRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(500);
    expect(jsonResponse.error).toEqual('Failed to retrieve information from YouTube due to an unexpected error.');
    expect(jsonResponse.details).toBe("An unexpected issue occurred.");
  });

});
