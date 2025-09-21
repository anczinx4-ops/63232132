import React, { useState } from 'react';
import { Download, Share2, Copy, CheckCircle, RefreshCw, Palette } from 'lucide-react';
import qrService from '../../services/qrService';

interface QRCodeDisplayProps {
  qrData: {
    dataURL: string;
    trackingUrl: string;
    eventId: string;
  };
  title: string;
  subtitle: string;
  allowCustomization?: boolean;
  batchData?: {
    batchId: string;
    type: string;
    herbSpecies?: string;
    participant?: string;
  };
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ 
  qrData, 
  title, 
  subtitle, 
  allowCustomization = false,
  batchData 
}) => {
  const [copied, setCopied] = useState(false);
  const [currentQR, setCurrentQR] = useState(qrData.dataURL);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const [customization, setCustomization] = useState({
    color: '2D5A27',
    backgroundColor: 'FFFFFF',
    size: 300
  });

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentQR;
    link.download = `${qrData.eventId}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(qrData.trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Track this ${title.toLowerCase()} using this link`,
          url: qrData.trackingUrl
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopyUrl();
    }
  };

  const handleRegenerate = async () => {
    if (!batchData) return;
    
    setIsRegenerating(true);
    try {
      const result = await qrService.generateEnhancedQR({
        type: batchData.type,
        batchId: batchData.batchId,
        eventId: qrData.eventId,
        herbSpecies: batchData.herbSpecies,
        [batchData.type === 'collection' ? 'collector' : 
         batchData.type === 'quality_test' ? 'tester' :
         batchData.type === 'processing' ? 'processor' : 'manufacturer']: batchData.participant
      }, {
        size: customization.size,
        useAPI: true,
        customization: {
          color: customization.color,
          backgroundColor: customization.backgroundColor
        }
      });
      
      if (result.success && result.dataURL) {
        setCurrentQR(result.dataURL);
      }
    } catch (error) {
      console.error('Failed to regenerate QR code:', error);
    } finally {
      setIsRegenerating(false);
    }
  };
  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-8 border border-green-200">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-green-800 mb-2">{title}</h3>
        <p className="text-green-600">{subtitle}</p>
      </div>

      {/* QR Code */}
      <div className="flex justify-center mb-6">
        <div className="bg-white p-4 rounded-xl shadow-lg border border-green-100">
          <img 
            src={currentQR} 
            alt={title}
            className="w-48 h-48 block"
          />
          {isRegenerating && (
            <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-xl">
              <RefreshCw className="h-8 w-8 text-green-600 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Customization Panel */}
      {allowCustomization && batchData && (
        <div className="mb-6">
          <button
            onClick={() => setShowCustomization(!showCustomization)}
            className="flex items-center space-x-2 text-sm text-green-600 hover:text-green-700 mb-3"
          >
            <Palette className="h-4 w-4" />
            <span>Customize QR Code</span>
          </button>
          
          {showCustomization && (
            <div className="bg-white rounded-lg p-4 border border-green-200 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    QR Color
                  </label>
                  <input
                    type="color"
                    value={`#${customization.color}`}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      color: e.target.value.substring(1)
                    }))}
                    className="w-full h-8 rounded border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Background
                  </label>
                  <input
                    type="color"
                    value={`#${customization.backgroundColor}`}
                    onChange={(e) => setCustomization(prev => ({
                      ...prev,
                      backgroundColor: e.target.value.substring(1)
                    }))}
                    className="w-full h-8 rounded border border-gray-300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Size: {customization.size}px
                </label>
                <input
                  type="range"
                  min="200"
                  max="500"
                  value={customization.size}
                  onChange={(e) => setCustomization(prev => ({
                    ...prev,
                    size: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
              </div>
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="w-full px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm flex items-center justify-center space-x-2"
              >
                {isRegenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Regenerating...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Apply Changes</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
      {/* Tracking URL */}
      <div className="bg-white rounded-lg p-4 mb-6 border border-green-100">
        <label className="block text-sm font-medium text-green-700 mb-2">
          Tracking URL
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={qrData.trackingUrl}
            readOnly
            className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg font-mono"
          />
          <button
            onClick={handleCopyUrl}
            className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            title="Copy URL"
          >
            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        {copied && (
          <p className="text-xs text-green-600 mt-1">URL copied to clipboard!</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={handleDownload}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Download QR</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          <Share2 className="h-4 w-4" />
          <span>Share Link</span>
        </button>
        
        {allowCustomization && batchData && (
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>
      
      {/* API Status */}
      <div className="mt-4 text-center">
        <p className="text-xs text-green-600">
          QR Code generated with enhanced API integration
        </p>
      </div>
    </div>
  );
};

export default QRCodeDisplay;