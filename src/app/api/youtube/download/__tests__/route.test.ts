// src/app/api/youtube/download/__tests__/route.test.ts
import { POST } from '../route'; // Adjust path as necessary
import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';

// Mock play-dl
jest.mock('play-dl', () => ({
  video_info: jest.fn(),
}));

// Mock aria2Client
jest.mock('@/lib/aria2Client', () => ({
  addUri: jest.fn(),
}));

// Import the mocked instances to configure their behavior in tests
const playdl = require('play-dl');
const aria2ClientMock = require('@/lib/aria2Client');

describe('/api/youtube/download POST endpoint', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  const validRequestBody = {
    videoId: 'testVideoId',
    itag: 22, // Example itag for a 720p mp4
    fileName: 'testVideo.mp4',
    title: 'Test Video Title',
  };

  it('should return 200 and task ID for a valid download request', async () => {
    const mockVideoFormat = { 
      itag: 22, 
      mimeType: 'video/mp4', 
      url: 'http://example.com/video.mp4',
      // ... other format properties if needed by the route's logic for selection (not directly used in download route)
    };
    playdl.video_info.mockResolvedValue({
      format: [mockVideoFormat], // Ensure the format array contains the itag
      // ... other video_details if your route uses them, but download route mainly needs format.url
    });
    const mockGid = 'mockAria2TaskId';
    aria2ClientMock.addUri.mockResolvedValue(mockGid);

    const { req } = createMocks({
      method: 'POST',
      json: () => Promise.resolve(validRequestBody),
    });

    const response = await POST(req as unknown as NextRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(200);
    expect(jsonResponse.message).toEqual('Download successfully added to Aria2 queue.');
    expect(jsonResponse.taskId).toEqual(mockGid);
    expect(playdl.video_info).toHaveBeenCalledWith(`https://www.youtube.com/watch?v=${validRequestBody.videoId}`);
    expect(aria2ClientMock.addUri).toHaveBeenCalledWith(mockVideoFormat.url, { out: validRequestBody.fileName });
  });

  it('should return 404 if the requested itag is not found', async () => {
    playdl.video_info.mockResolvedValue({
      format: [{ itag: 18, url: 'http://example.com/anotherformat.mp4' }], // Does not include itag 22
    });

    const { req } = createMocks({
      method: 'POST',
      json: () => Promise.resolve({ ...validRequestBody, itag: 999 }), // Requesting a non-existent itag
    });

    const response = await POST(req as unknown as NextRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(404);
    expect(jsonResponse.error).toContain(`Format with itag 999 for video ${validRequestBody.videoId} not found`);
  });

  it('should return 500 if play.video_info fails', async () => {
    playdl.video_info.mockRejectedValue(new Error('Failed to fetch video details'));

    const { req } = createMocks({
      method: 'POST',
      json: () => Promise.resolve(validRequestBody),
    });

    const response = await POST(req as unknown as NextRequest);
    const jsonResponse = await response.json();
    
    expect(response.status).toBe(500);
    expect(jsonResponse.error).toContain(`Failed to retrieve video information for ${validRequestBody.videoId}`);
  });
  
  it('should return 404 if play.video_info fails with unavailable/private error', async () => {
    playdl.video_info.mockRejectedValue(new Error('Video unavailable - private'));

    const { req } = createMocks({
      method: 'POST',
      json: () => Promise.resolve(validRequestBody),
    });

    const response = await POST(req as unknown as NextRequest);
    const jsonResponse = await response.json();
    
    expect(response.status).toBe(404);
    expect(jsonResponse.error).toContain(`Video ${validRequestBody.videoId} is unavailable`);
  });


  it('should return 500 if aria2Client.addUri fails', async () => {
    const mockVideoFormat = { itag: 22, url: 'http://example.com/video.mp4' };
    playdl.video_info.mockResolvedValue({ format: [mockVideoFormat] });
    aria2ClientMock.addUri.mockRejectedValue(new Error('Aria2 connection error'));

    const { req } = createMocks({
      method: 'POST',
      json: () => Promise.resolve(validRequestBody),
    });

    const response = await POST(req as unknown as NextRequest);
    const jsonResponse = await response.json();

    expect(response.status).toBe(500);
    expect(jsonResponse.error).toContain('Download manager operation failed: Aria2 connection error');
  });

  // Test cases for invalid request bodies
  const invalidBodyTestCases = [
    { body: {}, errorField: 'videoId', message: 'videoId is required and must be a string.' },
    { body: { videoId: 'test' }, errorField: 'itag', message: 'itag is required and must be a number.' },
    { body: { videoId: 'test', itag: 22 }, errorField: 'fileName', message: 'fileName is required and must be a string.' },
    { body: { videoId: 'test', itag: 22, fileName: 'file.mp4' }, errorField: 'title', message: 'title is required and must be a string.' },
  ];

  invalidBodyTestCases.forEach(tc => {
    it(`should return 400 if ${tc.errorField} is missing or invalid`, async () => {
      const { req } = createMocks({
        method: 'POST',
        json: () => Promise.resolve(tc.body),
      });

      const response = await POST(req as unknown as NextRequest);
      const jsonResponse = await response.json();

      expect(response.status).toBe(400);
      expect(jsonResponse.error).toEqual(tc.message);
    });
  });
  
  it('should return 400 for an invalid JSON payload', async () => {
    const req = new NextRequest('http://localhost/api/youtube/download', {
        method: 'POST',
        body: 'not a valid json string', // Invalid JSON
        headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(req);
    const jsonResponse = await response.json();
    expect(response.status).toBe(400);
    expect(jsonResponse.error).toEqual('Invalid JSON payload. Please ensure the request body is correctly formatted.');
  });

});
