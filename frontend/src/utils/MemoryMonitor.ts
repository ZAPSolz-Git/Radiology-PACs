// Memory Monitoring and Pressure Detection
// Helps prevent browser crashes from excessive memory usage

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface MemoryStats {
  current: number;
  peak: number;
  percentage: number;
  pressure: 'low' | 'medium' | 'high' | 'critical';
  deviceMemory: number;
}

class MemoryMonitor {
  private peakMemory = 0;
  private checkInterval: NodeJS.Timeout | null = null;
  private callbacks: Set<(stats: MemoryStats) => void> = new Set();

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats | null {
    // Check if memory API is available
    const performance = (window as any).performance;
    const memory = performance?.memory as MemoryInfo | undefined;

    if (!memory) {
      console.warn('[MemoryMonitor] Memory API not available');
      return null;
    }

    const currentMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
    const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
    const percentage = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);

    // Update peak
    if (currentMB > this.peakMemory) {
      this.peakMemory = currentMB;
    }

    // Determine pressure level
    let pressure: 'low' | 'medium' | 'high' | 'critical';
    if (percentage < 60) {
      pressure = 'low';
    } else if (percentage < 75) {
      pressure = 'medium';
    } else if (percentage < 90) {
      pressure = 'high';
    } else {
      pressure = 'critical';
    }

    // Get device memory if available
    const deviceMemory = (navigator as any).deviceMemory || 4; // Default to 4GB

    return {
      current: currentMB,
      peak: this.peakMemory,
      percentage,
      pressure,
      deviceMemory: deviceMemory * 1024, // Convert to MB
    };
  }

  /**
   * Start monitoring memory with periodic checks
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.checkInterval) {
      console.warn('[MemoryMonitor] Already monitoring');
      return;
    }

    console.log('[MemoryMonitor] Starting memory monitoring');
    this.checkInterval = setInterval(() => {
      const stats = this.getMemoryStats();
      if (stats) {
        // Notify all callbacks
        this.callbacks.forEach(callback => {
          try {
            callback(stats);
          } catch (e) {
            console.error('[MemoryMonitor] Callback error:', e);
          }
        });

        // Log warnings for high pressure
        if (stats.pressure === 'high') {
          console.warn(`[MemoryMonitor] HIGH memory pressure: ${stats.percentage}% (${stats.current}MB / ${Math.round(stats.deviceMemory)}MB)`);
        } else if (stats.pressure === 'critical') {
          console.error(`[MemoryMonitor] CRITICAL memory pressure: ${stats.percentage}% - Risk of crash!`);
        }
      }
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[MemoryMonitor] Stopped monitoring');
    }
  }

  /**
   * Subscribe to memory updates
   */
  subscribe(callback: (stats: MemoryStats) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Check if memory pressure is high
   */
  isMemoryPressureHigh(): boolean {
    const stats = this.getMemoryStats();
    return stats ? stats.pressure === 'high' || stats.pressure === 'critical' : false;
  }

  /**
   * Get recommended cache size based on device memory
   */
  getRecommendedCacheSize(): number {
    const deviceMemory = (navigator as any).deviceMemory || 4;
    const deviceMemoryBytes = deviceMemory * 1024 * 1024 * 1024;

    // OHIF-aligned: Use 25% of device memory, capped at 1GB
    // Previous 2-4GB range exceeded browser JS heap limits causing OOM crashes
    const recommendedBytes = Math.min(
      1 * 1024 * 1024 * 1024,   // 1GB max (was 4GB)
      Math.max(
        512 * 1024 * 1024,       // 512MB min (was 2GB)
        deviceMemoryBytes * 0.25 // 25% of device memory (was 30%)
      )
    );

    const recommendedMB = Math.round(recommendedBytes / 1024 / 1024);
    console.log(`[MemoryMonitor] Device memory: ${deviceMemory}GB, recommended cache: ${recommendedMB}MB`);

    return recommendedBytes;
  }

  /**
   * Reset peak memory tracking
   */
  resetPeak(): void {
    this.peakMemory = 0;
    console.log('[MemoryMonitor] Peak memory reset');
  }

  /**
   * Log current memory status
   */
  logStatus(): void {
    const stats = this.getMemoryStats();
    if (stats) {
      console.log('[MemoryMonitor] Current Status:');
      console.log(`  - Current: ${stats.current}MB`);
      console.log(`  - Peak: ${stats.peak}MB`);
      console.log(`  - Usage: ${stats.percentage}%`);
      console.log(`  - Pressure: ${stats.pressure.toUpperCase()}`);
      console.log(`  - Device Memory: ${Math.round(stats.deviceMemory / 1024)}GB`);
    } else {
      console.log('[MemoryMonitor] Memory API not available');
    }
  }

  /**
   * Suggest cleanup if memory is high
   */
  shouldTriggerCleanup(): boolean {
    const stats = this.getMemoryStats();
    if (!stats) return false;

    // Trigger cleanup at 80% memory usage
    // But allow higher usage if we are just spiking (monitor manually)
    return stats.percentage >= 85;
  }

  /**
   * Get adaptive delay based on memory pressure
   * Returns milliseconds to wait between operations
   */
  getAdaptiveDelay(): number {
    const stats = this.getMemoryStats();
    if (!stats) return 0;

    switch (stats.pressure) {
      case 'low':
        return 0; // No delay
      case 'medium':
        return 10; // Small delay
      case 'high':
        return 50; // Moderate delay
      case 'critical':
        return 200; // Significant delay
      default:
        return 0;
    }
  }
}

// Export singleton instance
export const memoryMonitor = new MemoryMonitor();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  memoryMonitor.startMonitoring(10000); // Check every 10 seconds in dev
}