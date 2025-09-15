let aiServiceState = {
    failures: 0,
    lastFailureTime: null,
    isCircuitOpen: false,
    circuitOpenTime: null
};

const CIRCUIT_BREAKER_THRESHOLD = 3; // failures
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
const MAX_CONSECUTIVE_FAILURES = 5;

// Helper function to check and update circuit breaker
export const checkCircuitBreaker = () => {
    const now = Date.now();
    
    // Reset circuit breaker after timeout
    if (aiServiceState.isCircuitOpen && 
        now - aiServiceState.circuitOpenTime > CIRCUIT_BREAKER_TIMEOUT) {
        console.log('Circuit breaker reset - attempting AI service again');
        aiServiceState.isCircuitOpen = false;
        aiServiceState.failures = 0;
    }
    
    return !aiServiceState.isCircuitOpen;
};

// Helper function to record AI service failure
export const recordAIFailure = () => {
    aiServiceState.failures++;
    aiServiceState.lastFailureTime = Date.now();
    
    if (aiServiceState.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        aiServiceState.isCircuitOpen = true;
        aiServiceState.circuitOpenTime = Date.now();
        console.log(`Circuit breaker opened after ${aiServiceState.failures} failures`);
    }
};

// Helper function to record AI service success
 export const recordAISuccess = () => {
    aiServiceState.failures = 0;
    aiServiceState.isCircuitOpen = false;
    aiServiceState.lastFailureTime = null;
};

// Helper function to retry API calls with exponential backoff
 export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn();
            return result;
        } catch (error) {
            // Check if it's a retryable error
            const isRetryable = error.status === 503 || 
                               error.status === 429 || 
                               error.status === 500 ||
                               error.message?.includes('overloaded') ||
                               error.message?.includes('rate limit') ||
                               error.message?.includes('timeout') ||
                               error.code === 'ECONNRESET' ||
                               error.code === 'ETIMEDOUT' ||
                               error.code === 'ENOTFOUND';

            if (!isRetryable || attempt === maxRetries) {
                throw error;
            }

            // Calculate delay with exponential backoff + jitter
            const jitter = Math.random() * 500;
            const delay = Math.min(baseDelay * Math.pow(2, attempt - 1) + jitter, 10000);
            
            console.log(`AI API attempt ${attempt} failed (${error.message}), retrying in ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};