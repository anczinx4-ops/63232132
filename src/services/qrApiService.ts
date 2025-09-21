// QR Code API Service with multiple providers for enhanced reliability
class QRApiService {
  private readonly providers = {
    qrserver: 'https://api.qrserver.com/v1/create-qr-code/',
    goqr: 'https://api.qrserver.com/v1/create-qr-code/',
    quickchart: 'https://quickchart.io/qr'
  };

  async generateQRWithAPI(data: string, options: {
    size?: number;
    format?: 'png' | 'svg' | 'jpg';
    errorCorrection?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    color?: string;
    backgroundColor?: string;
  } = {}): Promise<{ success: boolean; url?: string; dataURL?: string; error?: string }> {
    const {
      size = 300,
      format = 'png',
      errorCorrection = 'H',
      margin = 2,
      color = '2D5A27',
      backgroundColor = 'FFFFFF'
    } = options;

    try {
      // Try QR Server API first
      const qrServerUrl = this.buildQRServerUrl(data, {
        size,
        format,
        errorCorrection,
        margin,
        color,
        backgroundColor
      });

      // Test if the URL is accessible
      const response = await fetch(qrServerUrl, { method: 'HEAD' });
      
      if (response.ok) {
        // Convert to data URL for consistent usage
        const imageResponse = await fetch(qrServerUrl);
        const blob = await imageResponse.blob();
        const dataURL = await this.blobToDataURL(blob);
        
        return {
          success: true,
          url: qrServerUrl,
          dataURL
        };
      } else {
        throw new Error('QR Server API not accessible');
      }
    } catch (error) {
      console.warn('QR API failed, falling back to local generation:', error);
      
      // Fallback to QuickChart API
      try {
        const quickChartUrl = this.buildQuickChartUrl(data, { size, format });
        const response = await fetch(quickChartUrl);
        
        if (response.ok) {
          const blob = await response.blob();
          const dataURL = await this.blobToDataURL(blob);
          
          return {
            success: true,
            url: quickChartUrl,
            dataURL
          };
        }
      } catch (fallbackError) {
        console.warn('QuickChart API also failed:', fallbackError);
      }
      
      return {
        success: false,
        error: 'All QR code APIs are unavailable'
      };
    }
  }

  private buildQRServerUrl(data: string, options: any): string {
    const params = new URLSearchParams({
      data: encodeURIComponent(data),
      size: `${options.size}x${options.size}`,
      format: options.format,
      ecc: options.errorCorrection,
      margin: options.margin.toString(),
      color: options.color,
      bgcolor: options.backgroundColor
    });

    return `${this.providers.qrserver}?${params.toString()}`;
  }

  private buildQuickChartUrl(data: string, options: { size: number; format: string }): string {
    const params = new URLSearchParams({
      text: encodeURIComponent(data),
      size: `${options.size}x${options.size}`,
      format: options.format
    });

    return `${this.providers.quickchart}?${params.toString()}`;
  }

  private async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Generate QR code with batch information embedded
  async generateBatchQR(batchData: {
    batchId: string;
    eventId: string;
    type: string;
    herbSpecies?: string;
    participant?: string;
    trackingUrl?: string;
  }): Promise<{ success: boolean; dataURL?: string; url?: string; error?: string }> {
    const qrData = {
      ...batchData,
      timestamp: Date.now(),
      version: '1.0',
      network: 'hyperledger-fabric'
    };

    const dataString = JSON.stringify(qrData);
    
    return await this.generateQRWithAPI(dataString, {
      size: 300,
      format: 'png',
      errorCorrection: 'H',
      color: '2D5A27',
      backgroundColor: 'FFFFFF',
      margin: 2
    });
  }

  // Validate QR code data
  validateQRData(qrString: string): { valid: boolean; data?: any; error?: string } {
    try {
      const data = JSON.parse(qrString);
      
      // Check required fields
      if (!data.batchId || !data.eventId || !data.type) {
        return {
          valid: false,
          error: 'Missing required fields in QR code'
        };
      }

      return {
        valid: true,
        data
      };
    } catch (error) {
      return {
        valid: false,
        error: 'Invalid QR code format'
      };
    }
  }

  // Generate tracking URL QR code
  async generateTrackingQR(trackingUrl: string): Promise<{ success: boolean; dataURL?: string; error?: string }> {
    return await this.generateQRWithAPI(trackingUrl, {
      size: 200,
      format: 'png',
      errorCorrection: 'M'
    });
  }
}

export const qrApiService = new QRApiService();
export default qrApiService;