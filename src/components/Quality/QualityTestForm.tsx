import React, { useState, useEffect } from 'react';
import { TestTube, Upload, AlertCircle, CheckCircle, Loader2, QrCode, MapPin, Plus, X, Camera } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import blockchainService from '../../services/blockchainService';
import ipfsService from '../../services/ipfsService';
import qrService from '../../services/qrService';
import QRCodeDisplay from '../Common/QRCodeDisplay';
import QRScanner from '../Common/QRScanner';

// Define interfaces for type safety
interface CustomParameter {
  name: string;
  value: string;
}

interface FormData {
  batchId: string;
  labName: string;
  moistureContent: string;
  purity: string;
  pesticideLevel: string;
  testDate: string;
  testMethod: string;
  notes: string;
  testerName: string;
  image: File | null;
}

interface LocationData {
  latitude: string;
  longitude: string;
  timestamp: string;
}

interface QRResult {
  batchId: string;
  eventId: string;
  testResults: {
    moistureContent: number;
    purity: number;
    pesticideLevel: number;
  };
  qr: {
    dataURL: string;
    trackingUrl: string;
    qrHash: string;
  };
  hyperledgerFabric: any;
}

const QualityTestForm: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [qrResult, setQrResult] = useState<QRResult | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [customParameters, setCustomParameters] = useState<CustomParameter[]>([]);
  const [showQRScanner, setShowQRScanner] = useState<boolean>(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);

  const [formData, setFormData] = useState<FormData>({
    batchId: '',
    labName: '',
    moistureContent: '',
    purity: '',
    pesticideLevel: '',
    testDate: new Date().toISOString().split('T')[0],
    testMethod: 'Standard Laboratory Test',
    notes: '',
    testerName: user?.name || '',
    image: null,
  });

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
            timestamp: new Date().toISOString(),
          });
          setLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationLoading(false);
          // Don't set error for location - make it optional
        }
      );
    } else {
      setLocationLoading(false);
    }
  };

  const addCustomParameter = () => {
    setCustomParameters([...customParameters, { name: '', value: '' }]);
  };

  const removeCustomParameter = (index: number) => {
    setCustomParameters(customParameters.filter((_, i) => i !== index));
  };

  const updateCustomParameter = (index: number, field: 'name' | 'value', value: string) => {
    const updated = [...customParameters];
    updated[index][field] = value;
    setCustomParameters(updated);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setFormData((prev) => ({
        ...prev,
        image: file,
      }));
    } else {
      setError('Please upload a valid image file (PNG, JPG, JPEG).');
    }
  };

  const handleQRScanSuccess = (qrData: any) => {
    console.log('QR Data received:', qrData);
    setFormData((prev) => ({
      ...prev,
      batchId: qrData.batchId || '',
    }));
    setShowQRScanner(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Validate required fields
      if (!formData.batchId) {
        throw new Error('Batch ID is required. Please enter the batch ID or scan the collection QR code.');
      }
      if (!formData.moistureContent || !formData.purity || !formData.pesticideLevel) {
        throw new Error('Please fill in all required test result fields.');
      }

      // Verify the batch exists
      try {
        await blockchainService.getBatchInfo(formData.batchId);
      } catch (error) {
        throw new Error(`Batch ${formData.batchId} not found. Please check the batch ID.`);
      }

      const testEventId = blockchainService.generateEventId('QUALITY_TEST');

      let imageHash: string | null = null;
      if (formData.image) {
        const imageUpload = await ipfsService.uploadFile(formData.image);
        if (imageUpload.success) {
          imageHash = imageUpload.ipfsHash;
        } else {
          throw new Error('Failed to upload image to IPFS.');
        }
      }

      // Create test metadata
      const testData = {
        batchId: formData.batchId,
        eventId: testEventId,
        tester: formData.testerName,
        labName: formData.labName,
        moistureContent: parseFloat(formData.moistureContent),
        purity: parseFloat(formData.purity),
        pesticideLevel: parseFloat(formData.pesticideLevel),
        testMethod: formData.testMethod,
        testDate: formData.testDate,
        location,
        customParameters: customParameters.filter((p) => p.name && p.value),
        notes: formData.notes,
        images: imageHash ? [imageHash] : [],
      };

      const metadataUpload = await ipfsService.createQualityTestMetadata(testData);
      if (!metadataUpload.success) {
        console.warn('IPFS upload warning:', metadataUpload.warning || 'Upload failed');
        throw new Error('Failed to upload metadata to IPFS.');
      }

      // Generate QR code
      const qrResult = await qrService.generateQualityTestQR(
        formData.batchId,
        testEventId,
        formData.testerName
      );

      if (!qrResult.success) {
        throw new Error('Failed to generate QR code.');
      }

      // Add event to blockchain
      const eventData = {
        batchId: formData.batchId,
        testerName: formData.testerName,
        moistureContent: parseFloat(formData.moistureContent),
        purity: parseFloat(formData.purity),
        pesticideLevel: parseFloat(formData.pesticideLevel),
        testMethod: formData.testMethod,
        customParameters: customParameters.filter((p) => p.name && p.value),
        notes: formData.notes,
        ipfsHash: metadataUpload.data.ipfsHash,
        location: {
          latitude: location?.latitude || '0',
          longitude: location?.longitude || '0',
          zone: formData.labName || 'Laboratory',
        },
        qrCodeHash: qrResult.qrHash,
      };

      const blockchainResult = await blockchainService.addQualityTestEvent(
        user?.address || '',
        eventData
      );

      if (!blockchainResult?.success) {
        throw new Error('Failed to record on Hyperledger Fabric: ' + (blockchainResult?.error || 'Unknown error'));
      }

      setSuccess(true);
      setQrResult({
        batchId: formData.batchId,
        eventId: testEventId,
        testResults: {
          moistureContent: parseFloat(formData.moistureContent),
          purity: parseFloat(formData.purity),
          pesticideLevel: parseFloat(formData.pesticideLevel),
        },
        qr: qrResult,
        hyperledgerFabric: blockchainResult,
      });

      // Reset form
      setFormData({
        batchId: '',
        labName: '',
        moistureContent: '',
        purity: '',
        pesticideLevel: '',
        testDate: new Date().toISOString().split('T')[0],
        testMethod: 'Standard Laboratory Test',
        notes: '',
        testerName: user?.name || '',
        image: null,
      });
      setCustomParameters([]);
    } catch (error) {
      setError((error as Error).message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setQrResult(null);
    setError('');
    setFormData({
      batchId: '',
      labName: '',
      moistureContent: '',
      purity: '',
      pesticideLevel: '',
      testDate: new Date().toISOString().split('T')[0],
      testMethod: 'Standard Laboratory Test',
      notes: '',
      testerName: user?.name || '',
      image: null,
    });
    setCustomParameters([]);
  };

  if (success && qrResult) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Quality Test Completed!</h2>
            <p className="text-green-600">Test results have been recorded on the blockchain</p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-700">Batch ID:</span>
                <p className="text-blue-900 font-mono">{qrResult.batchId}</p>
              </div>
              <div>
                <span className="font-medium text-blue-700">Test Event ID:</span>
                <p className="text-blue-900 font-mono">{qrResult.eventId}</p>
              </div>
              <div>
                <span className="font-medium text-blue-700">Moisture Content:</span>
                <p className="text-blue-900">{qrResult.testResults.moistureContent}%</p>
              </div>
              <div>
                <span className="font-medium text-blue-700">Purity:</span>
                <p className="text-blue-900">{qrResult.testResults.purity}%</p>
              </div>
              <div>
                <span className="font-medium text-blue-700">Pesticide Level:</span>
                <p className="text-blue-900">{qrResult.testResults.pesticideLevel} ppm</p>
              </div>
              <div>
                <span className="font-medium text-blue-700">Status:</span>
                <p
                  className={`font-bold ${
                    qrResult.testResults.purity >= 95 && qrResult.testResults.pesticideLevel <= 0.1
                      ? 'text-blue-600'
                      : 'text-blue-600'
                  }`}
                >
                  {qrResult.testResults.purity >= 95 && qrResult.testResults.pesticideLevel <= 0.1
                    ? 'COLLECTED'
                    : 'COLLECTED'}
                </p>
              </div>
            </div>
          </div>

          <QRCodeDisplay
            qrData={{
              dataURL: qrResult.qr.dataURL,
              trackingUrl: qrResult.qr.trackingUrl,
              eventId: qrResult.eventId,
            }}
            title="Quality Test QR Code"
            subtitle="Scan to view test results"
          />

          <button
            onClick={handleReset}
            className="w-full mt-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-medium"
            aria-label="Perform new quality test"
          >
            Perform New Test
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
            <TestTube className="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-blue-800">Testing Labs</h2>
            <p className="text-blue-600">Record quality test results with location and timestamp</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2" role="alert">
            <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6" aria-label="Quality Test Form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 flex justify-center">
              <div className="w-full max-w-md">
                <label
                  htmlFor="batchId"
                  className="block text-sm font-medium text-blue-700 mb-2 text-center"
                >
                  Batch ID *
                </label>
                <div className="flex space-x-2">
                  <input
                    id="batchId"
                    type="text"
                    name="batchId"
                    value={formData.batchId}
                    onChange={handleInputChange}
                    required
                    placeholder="HERB-1234567890-1234"
                    className="flex-1 px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                    aria-required="true"
                  />
                  <button
                    type="button"
                    onClick={() => setShowQRScanner(true)}
                    className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                    aria-label="Scan QR code for batch ID"
                  >
                    <Camera className="h-5 w-5" aria-hidden="true" />
                    <span>Scan</span>
                  </button>
                </div>
                <p className="text-xs text-blue-600 mt-1 text-center">
                  Enter the batch ID from the collection step or scan QR code
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="moistureContent"
                className="block text-sm font-medium text-blue-700 mb-2"
              >
                Moisture Content (%) *
              </label>
              <input
                id="moistureContent"
                type="number"
                step="0.1"
                name="moistureContent"
                value={formData.moistureContent}
                onChange={handleInputChange}
                required
                placeholder="10.5"
                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-required="true"
              />
            </div>

            <div>
              <label htmlFor="purity" className="block text-sm font-medium text-blue-700 mb-2">
                Purity (%) *
              </label>
              <input
                id="purity"
                type="number"
                step="0.1"
                name="purity"
                value={formData.purity}
                onChange={handleInputChange}
                required
                placeholder="98.7"
                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-required="true"
              />
            </div>

            <div>
              <label
                htmlFor="pesticideLevel"
                className="block text-sm font-medium text-blue-700 mb-2"
              >
                Pesticide Level (ppm) *
              </label>
              <input
                id="pesticideLevel"
                type="number"
                step="0.001"
                name="pesticideLevel"
                value={formData.pesticideLevel}
                onChange={handleInputChange}
                required
                placeholder="0.005"
                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-required="true"
              />
            </div>

            <div>
              <label htmlFor="testMethod" className="block text-sm font-medium text-blue-700 mb-2">
                Test Method
              </label>
              <select
                id="testMethod"
                name="testMethod"
                value={formData.testMethod}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Select test method"
              >
                <option value="Standard Laboratory Test">Standard Laboratory Test</option>
                <option value="HPLC Analysis">HPLC Analysis</option>
                <option value="GC-MS Analysis">GC-MS Analysis</option>
                <option value="UV Spectroscopy">UV Spectroscopy</option>
                <option value="Microbiological Test">Microbiological Test</option>
              </select>
            </div>

            <div>
              <label htmlFor="labName" className="block text-sm font-medium text-blue-700 mb-2">
                Lab/Institution Name *
              </label>
              <input
                id="labName"
                type="text"
                name="labName"
                value={formData.labName}
                onChange={handleInputChange}
                required
                placeholder="Enter lab or institution name"
                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-required="true"
              />
            </div>

            <div>
              <label htmlFor="testDate" className="block text-sm font-medium text-blue-700 mb-2">
                Test Date *
              </label>
              <input
                id="testDate"
                type="date"
                name="testDate"
                value={formData.testDate}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-required="true"
              />
            </div>

            <div>
              <label htmlFor="testerName" className="block text-sm font-medium text-blue-700 mb-2">
                Tester Name *
              </label>
              <input
                id="testerName"
                type="text"
                name="testerName"
                value={formData.testerName}
                onChange={handleInputChange}
                required
                placeholder="Enter tester name"
                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-required="true"
              />
            </div>
          </div>

          {/* Location Info */}
          {location && (
            <div
              className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200"
              aria-label="Test Location Information"
            >
              <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                <MapPin className="h-4 w-4 mr-2" aria-hidden="true" />
                Test Location & Timestamp
              </h3>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-medium text-blue-600">Latitude:</span>
                  <p className="text-blue-900">{parseFloat(location.latitude).toFixed(6)}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-600">Longitude:</span>
                  <p className="text-blue-900">{parseFloat(location.longitude).toFixed(6)}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-600">Timestamp:</span>
                  <p className="text-blue-900">{new Date(location.timestamp).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Custom Parameters */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-blue-700">
                Additional Test Parameters
              </label>
              <button
                type="button"
                onClick={addCustomParameter}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                aria-label="Add new test parameter"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Add Parameter</span>
              </button>
            </div>

            {customParameters.map((param, index) => (
              <div key={index} className="flex space-x-2 mb-2" aria-label={`Custom Parameter ${index + 1}`}>
                <input
                  type="text"
                  placeholder="Parameter name"
                  value={param.name}
                  onChange={(e) => updateCustomParameter(index, 'name', e.target.value)}
                  className="flex-1 px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  aria-label={`Parameter name ${index + 1}`}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={param.value}
                  onChange={(e) => updateCustomParameter(index, 'value', e.target.value)}
                  className="flex-1 px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  aria-label={`Parameter value ${index + 1}`}
                />
                <button
                  type="button"
                  onClick={() => removeCustomParameter(index)}
                  className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label={`Remove parameter ${index + 1}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          {/* Image Upload */}
          <div>
            <label htmlFor="imageUpload" className="block text-sm font-medium text-blue-700 mb-2">
              Upload Test Results Image (optional)
            </label>
            <div className="border-2 border-dashed border-blue-200 rounded-lg p-6">
              <div className="text-center">
                <TestTube className="h-12 w-12 text-blue-400 mx-auto mb-4" aria-hidden="true" />
                <div className="flex text-sm text-blue-600">
                  <label
                    htmlFor="imageUpload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="imageUpload"
                      type="file"
                      name="image"
                      onChange={handleFileChange}
                      accept="image/png,image/jpeg,image/jpg"
                      className="sr-only"
                      aria-label="Upload test results image"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-blue-500">PNG, JPG, JPEG up to 10MB</p>
                {formData.image && (
                  <p className="mt-2 text-sm font-medium text-blue-700">
                    Selected: {formData.image.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-blue-700 mb-2">
              Test Notes (optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Add any additional notes about this quality test..."
              className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Additional test notes"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            aria-label="Record test results"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Recording Test Results...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" aria-hidden="true" />
                <span>Record Test Results</span>
              </>
            )}
          </button>
        </form>

        {/* QR Scanner Modal */}
        {showQRScanner && (
          <QRScanner
            title="Scan QR Code from Previous Step"
            onScanSuccess={handleQRScanSuccess}
            onClose={() => setShowQRScanner(false)}
          />
        )}
      </div>
    </div>
  );
};

export default QualityTestForm;