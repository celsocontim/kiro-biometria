import { RecognitionService } from '../RecognitionService';

describe('RecognitionService', () => {
  let service: RecognitionService;

  beforeEach(() => {
    service = new RecognitionService();
  });

  describe('Basic functionality', () => {
    it('should return a recognition result with userId', async () => {
      const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const userId = 'test-user-123';

      const result = await service.recognize(imageData, userId);

      expect(result).toHaveProperty('recognized');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('userId');
      expect(result.userId).toBe(userId);
      expect(typeof result.recognized).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
    });

    it('should return confidence between 0 and 1', async () => {
      const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const userId = 'test-user-456';

      const result = await service.recognize(imageData, userId);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include userId in result', async () => {
      const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const userId = 'user-with-special-chars-!@#';

      const result = await service.recognize(imageData, userId);

      expect(result.userId).toBe(userId);
    });

    it('should handle different userIds correctly', async () => {
      const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const userId1 = 'user-1';
      const userId2 = 'user-2';

      const result1 = await service.recognize(imageData, userId1);
      const result2 = await service.recognize(imageData, userId2);

      expect(result1.userId).toBe(userId1);
      expect(result2.userId).toBe(userId2);
    });
  });

  describe('Mock behavior', () => {
    it('should simulate processing delay', async () => {
      const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const userId = 'test-user';

      const startTime = Date.now();
      await service.recognize(imageData, userId);
      const endTime = Date.now();

      const duration = endTime - startTime;
      // Mock should take at least 500ms (minimum delay)
      expect(duration).toBeGreaterThanOrEqual(500);
    });

    it('should return random results on multiple calls', async () => {
      const imageData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
      const userId = 'test-user';

      // Call multiple times to check for randomness
      const results = await Promise.all([
        service.recognize(imageData, userId),
        service.recognize(imageData, userId),
        service.recognize(imageData, userId),
        service.recognize(imageData, userId),
        service.recognize(imageData, userId)
      ]);

      // Check that we get varied results (not all the same)
      const recognizedValues = results.map(r => r.recognized);
      const confidenceValues = results.map(r => r.confidence);

      // At least some variation in confidence (very unlikely all are identical)
      const uniqueConfidences = new Set(confidenceValues);
      expect(uniqueConfidences.size).toBeGreaterThan(1);
    });
  });
});
