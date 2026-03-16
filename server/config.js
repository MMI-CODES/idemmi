/**
 * Configuration that enforces security and resource limits
 * on the backend execution engine.
 */
export const SERVER_CONFIG = {
  // Max number of separate sessions executing at the exact same moment
  MAX_CONCURRENT_CLIENTS: parseInt(process.env.MAX_CONCURRENT_CLIENTS || '60', 10),
  
  // Max number of connected socket clients
  MAX_CONNECTED_CLIENTS: parseInt(process.env.MAX_CONNECTED_CLIENTS || '200', 10),

  // Socket idle timeout (if no 'run' or 'input' event for this amount of time, disconnect)
  CLIENT_IDLE_TIMEOUT_MS: parseInt(process.env.CLIENT_IDLE_TIMEOUT_MS || '1800000', 10), // Default: 30 minutes

  // Initial CPU time / execution time in MS (Timeout) if the program is completely inactive (no inputs)
  INACTIVITY_TIMEOUT_MS: parseInt(process.env.INACTIVITY_TIMEOUT_MS || '30000', 10), // Default: 30s
  
  // Absolute maximum execution time even with unlimited inputs
  ABSOLUTE_MAX_TIME_MS: parseInt(process.env.ABSOLUTE_MAX_TIME_MS || '120000', 10), // Default: 2 minutes
  
  // Max compilation time in MS (to prevent infinite generics compiling)
  MAX_COMPILE_TIME_MS: parseInt(process.env.MAX_COMPILE_TIME_MS || '10000', 10), // Default: 10s

  // Max RAM allocated to the running process (in Megabytes)
  MAX_MEMORY_MB: parseInt(process.env.MAX_MEMORY_MB || '128', 10), // Default: 128MB

  // Max characters/bytes allowed to be streamed to stdout/stderr
  MAX_OUTPUT_SIZE_BYTES: parseInt(process.env.MAX_OUTPUT_SIZE_BYTES || '2097152', 10), // Default: 2MB

  // Max number of files accepted per execution session (mirrors the frontend limit)
  MAX_FILES_PER_SESSION: parseInt(process.env.MAX_FILES_PER_SESSION || '5', 10),

  // Max size per individual source file (in bytes)
  MAX_FILE_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_BYTES || '102400', 10), // Default: 100 KB
};
