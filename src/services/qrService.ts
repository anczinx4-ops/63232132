import QRCode from 'qrcode';
import qrApiService from './qrApiService';

class QRService {
  private baseUrl = window.location.origin;

  async generateQR(data: any, title: string): Promise<{ success: boolean; dataURL?: string; trackingUrl?: string; qrHash?: string; error?: string }> {
    try {
      const qrData = {
        ...data,
        trackingUrl: `${this.baseUrl}/track/${data.eventId}`,
        timestamp: Date.now(),
        version: '1.0'
      };

      const qrString = JSON.stringify(qrData);
      const qrHash = await this.generateHash(qrString);
      
      // Try API first, fallback to local generation
      let qrCodeDataURL: string;
      
      try {
        const apiResult = await qrApiService.generateQRWithAPI(qrString, {
          size: 300,
          format: 'png',
          errorCorrection: 'H',
          margin: 2,
          color: '2D5A27',
          backgroundColor: 'FFFFFF'
        });
        
        if (apiResult.success && apiResult.dataURL) {
          qrCodeDataURL = apiResult.dataURL;
          console.log('✅ QR code generated using API');
        } else {
          throw new Error('API generation failed');
        }
      } catch (apiError) {
        console.warn('QR API failed, using local generation:', apiError);
        
        // Fallback to local QRCode library
        qrCodeDataURL = await QRCode.toDataURL(qrString, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          quality: 0.92,
          margin: 2,
          color: {
            dark: '#2D5A27',
            light: '#FFFFFF'
          },
          width: 300
        });
        console.log('✅ QR code generated locally');
      }

      return {
        success: true,
        dataURL: qrCodeDataURL,
        trackingUrl: qrData.trackingUrl,
        qrHash
      };
    } catch (error) {
      console.error('Error generating QR code:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  // Enhanced QR generation with API integration
  async generateEnhancedQR(data: any, options: {
    size?: number;
    useAPI?: boolean;
    customization?: {
      color?: string;
      backgroundColor?: string;
      logo?: string;
    };
  } = {}): Promise<{ success: boolean; dataURL?: string; trackingUrl?: string; qrHash?: string; error?: string }> {
    const { size = 300, useAPI = true, customization = {} } = options;
    
    try {
      const qrData = {
        ...data,
        trackingUrl: `${this.baseUrl}/track/${data.eventId}`,
        timestamp: Date.now(),
        version: '1.0'
      };

      const qrString = JSON.stringify(qrData);
      const qrHash = await this.generateHash(qrString);
      
      let qrCodeDataURL: string;
      
      if (useAPI) {
        const apiResult = await qrApiService.generateBatchQR({
          batchId: data.batchId,
          eventId: data.eventId,
          type: data.type,
          herbSpecies: data.herbSpecies,
          participant: data.collector || data.tester || data.processor || data.manufacturer,
          trackingUrl: qrData.trackingUrl
        });
        
        if (apiResult.success && apiResult.dataURL) {
          qrCodeDataURL = apiResult.dataURL;
        } else {
          throw new Error('API generation failed');
        }
      } else {
        // Use local generation with customization
        qrCodeDataURL = await QRCode.toDataURL(qrString, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          quality: 0.92,
          margin: 2,
          color: {
            dark: customization.color || '#2D5A27',
            light: customization.backgroundColor || '#FFFFFF'
          },
          width: size
        });
      }

      return {
        success: true,
        dataURL: qrCodeDataURL,
        trackingUrl: qrData.trackingUrl,
        qrHash
      };
    } catch (error) {
      console.error('Error generating enhanced QR code:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async generateCollectionQR(batchId: string, eventId: string, herbSpecies: string, collectorName: string) {
    const data = {
      type: 'collection',
      batchId,
      eventId,
      herbSpecies,
      collector: collectorName
    };

    return await this.generateEnhancedQR(data, {
      size: 300,
      useAPI: true,
      customization: {
        color: '16A34A', // Green for collection
        backgroundColor: 'F0FDF4'
      }
    });
  }

  async generateQualityTestQR(batchId: string, eventId: string, testerName: string) {
    const data = {
      type: 'quality_test',
      batchId,
      eventId,
      tester: testerName
    };

    return await this.generateEnhancedQR(data, {
      size: 300,
      useAPI: true,
      customization: {
        color: '2563EB', // Blue for testing
        backgroundColor: 'EFF6FF'
      }
    });
  }

  async generateProcessingQR(batchId: string, eventId: string, processorName: string, method: string) {
    const data = {
      type: 'processing',
      batchId,
      eventId,
      processor: processorName,
      method
    };

    return await this.generateEnhancedQR(data, {
      size: 300,
      useAPI: true,
      customization: {
        color: '7C3AED', // Purple for processing
        backgroundColor: 'F3E8FF'
      }
    });
  }

  async generateManufacturingQR(batchId: string, eventId: string, manufacturerName: string, productName: string) {
    const data = {
      type: 'manufacturing',
      batchId,
      eventId,
      manufacturer: manufacturerName,
      productName
    };

    return await this.generateEnhancedQR(data, {
      size: 300,
      useAPI: true,
      customization: {
        color: 'EA580C', // Orange for manufacturing
        backgroundColor: 'FFF7ED'
      }
    });
  }

  // Generate simple tracking QR for consumers
  async generateTrackingQR(trackingUrl: string): Promise<{ success: boolean; dataURL?: string; error?: string }> {
    try {
      const result = await qrApiService.generateTrackingQR(trackingUrl);
      
      if (!result.success) {
        // Fallback to local generation
        const dataURL = await QRCode.toDataURL(trackingUrl, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          quality: 0.92,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          width: 200
        });
        
        return { success: true, dataURL };
      }
      
      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  parseQRData(qrString: string) {
    try {
      // Use API service validation first
      const apiValidation = qrApiService.validateQRData(qrString);
      if (apiValidation.valid) {
        return {
          success: true,
          data: apiValidation.data
        };
      }
      
      // Fallback to local parsing
      let qrData;
      
      // Try to parse as JSON first
      try {
        qrData = JSON.parse(qrString);
      } catch {
        // If not JSON, treat as direct event ID
        qrData = {
          eventId: qrString.trim(),
          type: 'direct_id',
          batchId: qrString.trim()
        };
      }
      
      if (!qrData.eventId) {
        throw new Error('Invalid QR code format - missing event ID');
      }

      return {
        success: true,
        data: qrData
      };
    } catch (error) {
      console.error('Error parsing QR data:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  private async generateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const qrService = new QRService();
export default qrService;