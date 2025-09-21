import React, { useState } from 'react';
import { Package, Upload, AlertCircle, CheckCircle, Loader2, QrCode, Award, Camera } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import blockchainService from '../../services/blockchainService';
import ipfsService from '../../services/ipfsService';
import qrService from '../../services/qrService';
import QRCodeDisplay from '../Common/QRCodeDisplay';
import QRScanner from '../Common/QRScanner';

const ManufacturingForm: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [qrResult, setQrResult] = useState<any>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const [formData, setFormData] = useState({
    batchId: '',
    qrCode: '',
    lotNumber: '',
    productName: '',
    productType: 'Herbal Product',
    quantity: '',
    unit: 'units',
    manufactureDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    certificationId: '',
    notes: '',
    manufacturerName: user?.name || '',
    image: null as File | null
  });

  const productTypes = [
    'Herbal Product',
    'Capsules',
    'Tablets',
    'Powder',
    'Extract',
    'Oil',
    'Tincture',
    'Tea',
    'Syrup',
    'Cream/Ointment'
  ];

  const units = [
    'units',
    'bottles',
    'packets',
    'grams',
    'kilograms',
    'milliliters',
    'liters'
  ];

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
            timestamp: new Date().toISOString()
          });
          setLocationLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationLoading(false);
        }
      );
    } else {
      setLocationLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
    }
  };

  const handleQRScanSuccess = (qrData: any) => {
    console.log('QR Data received:', qrData);
    setFormData(prev => ({
      ...prev,
      batchId: qrData.batchId || '',
      parentEventId: qrData.eventId || '',
      qrCode: JSON.stringify(qrData)
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
      // Validate that we have the required batch ID
      if (!formData.batchId) {
        throw new Error('Batch ID is required. Please enter the batch ID or scan a QR code.');
      }
      
      // Verify the batch exists
      try {
        await blockchainService.getBatchInfo(formData.batchId);
      } catch (error) {
        throw new Error(`Batch ${formData.batchId} not found. Please check the batch ID.`);
      }

      const mfgEventId = blockchainService.generateEventId('MANUFACTURING');

      let imageHash = null;
      if (formData.image) {
        const imageUpload = await ipfsService.uploadFile(formData.image);
        if (imageUpload.success) {
          imageHash = imageUpload.ipfsHash;
        }
      }

      // Create manufacturing metadata
      const mfgData = {
        batchId: formData.batchId,
        eventId: mfgEventId,
        manufacturer: formData.manufacturerName,
        lotNumber: formData.lotNumber,
        productName: formData.productName,
        productType: formData.productType,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        manufactureDate: formData.manufactureDate,
        expiryDate: formData.expiryDate,
        certificationId: formData.certificationId,
        manufacturingDate: new Date().toISOString().split('T')[0],
        notes: formData.notes,
        images: imageHash ? [imageHash] : []
      };

      const metadataUpload = await ipfsService.createManufacturingMetadata(mfgData);
      if (!metadataUpload.success) {
        console.warn('IPFS upload warning:', metadataUpload.warning || 'Upload failed');
        // Continue with demo hash if IPFS fails
      }

      // Generate QR code
      const qrResult = await qrService.generateManufacturingQR(
        formData.batchId,
        mfgEventId,
        formData.manufacturerName,
        formData.productName
      );

      if (!qrResult.success) {
        throw new Error('Failed to generate QR code');
      }

      // Add event to blockchain
      const eventData = {
        batchId: formData.batchId,
        manufacturerName: formData.manufacturerName,
        productName: formData.productName,
        productType: formData.productType,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        expiryDate: formData.expiryDate,
        certificationId: formData.certificationId,
        notes: formData.notes,
        ipfsHash: metadataUpload.data.ipfsHash,
        location: {
          latitude: location?.latitude || '0',
          longitude: location?.longitude || '0',
          zone: 'Manufacturing Facility'
        },
        qrCodeHash: qrResult.qrHash
      };

      const blockchainResult = await blockchainService.addManufacturingEvent(
        user?.address || '',
        eventData
      );

      if (!blockchainResult?.success) {
        throw new Error('Failed to record on Hyperledger Fabric: ' + (blockchainResult?.error || 'Unknown error'));
      }

      setSuccess(true);
      setQrResult({
        batchId: formData.batchId,
        eventId: mfgEventId,
        product: {
          lotNumber: formData.lotNumber,
          name: formData.productName,
          type: formData.productType,
          quantity: parseFloat(formData.quantity),
          unit: formData.unit,
          manufactureDate: formData.manufactureDate,
          expiryDate: formData.expiryDate
        },
        qr: qrResult,
        hyperledgerFabric: blockchainResult
      });
      
      // Reset form
      setFormData({
        lotNumber: '',
        productName: '',
        productType: 'Herbal Product',
        quantity: '',
        unit: 'units',
        manufactureDate: new Date().toISOString().split('T')[0],
        expiryDate: '',
        certificationId: '',
        notes: '',
        manufacturerName: user?.name || '',
        image: null
      });
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setQrResult(null);
    setError('');
  };

  if (success && qrResult) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-800 mb-2">Manufacturing Completed!</h2>
            <p className="text-green-600">Product manufacturing has been recorded on the blockchain</p>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-orange-700">Original Batch ID:</span>
                <p className="text-orange-900 font-mono">{qrResult.batchId}</p>
              </div>
              <div>
                <span className="font-medium text-orange-700">Manufacturing Event ID:</span>
                <p className="text-orange-900 font-mono">{qrResult.eventId}</p>
              </div>
              <div>
                <span className="font-medium text-orange-700">Product Name:</span>
                <p className="text-orange-900">{qrResult.product.name}</p>
              </div>
              <div>
                <span className="font-medium text-orange-700">Product Type:</span>
                <p className="text-orange-900">{qrResult.product.type}</p>
              </div>
              <div>
                <span className="font-medium text-orange-700">Quantity:</span>
                <p className="text-orange-900">{qrResult.product.quantity} {qrResult.product.unit}</p>
              </div>
              {qrResult.product.expiryDate && (
                <div>
                  <span className="font-medium text-orange-700">Expiry Date:</span>
                  <p className="text-orange-900">{qrResult.product.expiryDate}</p>
                </div>
              )}
            </div>
          </div>

          <QRCodeDisplay
            qrData={{
              dataURL: qrResult.qr.dataURL,
              trackingUrl: qrResult.qr.trackingUrl,
              eventId: qrResult.eventId
            }}
            title="Final Product QR Code"
            subtitle="Consumer can scan to view complete traceability"
            allowCustomization={true}
            batchData={{
              batchId: qrResult.batchId,
              type: 'manufacturing',
              participant: formData.manufacturerName
            }}
          />

          <button
            onClick={handleReset}
            className="w-full mt-6 bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-4 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium"
          >
            Manufacture New Product
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
            <Package className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-orange-800">Manufacturing Plant</h2>
            <p className="text-orange-600">Record final product manufacturing with certifications</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 flex justify-center">
              <div className="w-full max-w-md">
                <label className="block text-sm font-medium text-orange-700 mb-2 text-center">
                  Batch ID *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text" 
                    name="batchId"
                    value={formData.batchId}
                    onChange={handleInputChange}
                    required
                    placeholder="HERB-1234567890-1234"
                    className="flex-1 px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setShowQRScanner(true)}
                    className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center space-x-2"
                  >
                    <Camera className="h-5 w-5" />
                    <span>Scan</span>
                  </button>
                </div>
                <p className="text-xs text-orange-600 mt-1 text-center">
                  Enter the batch ID from the processing step or scan QR code
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Batch/LOT Number *
              </label>
              <input
                type="text"
                name="lotNumber"
                value={formData.lotNumber}
                onChange={handleInputChange}
                required
                placeholder="LOT-2024-001"
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                name="productName"
                value={formData.productName}
                onChange={handleInputChange}
                required
                placeholder="Ashwagandha Capsules"
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Product Type
              </label>
              <select
                name="productType"
                value={formData.productType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {productTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                step="0.1"
                name="quantity"
                value={formData.quantity}
                onChange={handleInputChange}
                required
                placeholder="1000"
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Unit
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Manufacture Date *
              </label>
              <input
                type="date"
                name="manufactureDate"
                value={formData.manufactureDate}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Expiry Date
              </label>
              <input
                type="date"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Regulatory/Certification ID
              </label>
              <input
                type="text"
                name="certificationId"
                value={formData.certificationId}
                onChange={handleInputChange}
                placeholder="GMP/AYUSH/FDA certification number"
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="text-xs text-orange-600 mt-1">
                Enter GMP, AYUSH, FDA or other regulatory certification numbers
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-orange-700 mb-2">
                Manufacturer Name *
              </label>
              <input
                type="text"
                name="manufacturerName"
                value={formData.manufacturerName}
                onChange={handleInputChange}
                required
                placeholder="Enter manufacturer name"
                className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-2">
              Upload Product Image (optional)
            </label>
            <div className="border-2 border-dashed border-orange-200 rounded-lg p-6">
              <div className="text-center">
                <Package className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                <div className="flex text-sm text-orange-600">
                  <label className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500">
                    <span>Upload a file</span>
                    <input
                      type="file"
                      name="image"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-orange-500">PNG, JPG, JPEG up to 10MB</p>
                {formData.image && (
                  <p className="mt-2 text-sm font-medium text-orange-700">
                    Selected: {formData.image.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Location Info */}
          {location && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
              <h3 className="text-sm font-semibold text-orange-800 mb-2 flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                Manufacturing Location & Timestamp
              </h3>
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-medium text-orange-600">Latitude:</span>
                  <p className="text-orange-900">{parseFloat(location.latitude).toFixed(6)}</p>
                </div>
                <div>
                  <span className="font-medium text-orange-600">Longitude:</span>
                  <p className="text-orange-900">{parseFloat(location.longitude).toFixed(6)}</p>
                </div>
                <div>
                  <span className="font-medium text-orange-600">Timestamp:</span>
                  <p className="text-orange-900">{new Date(location.timestamp).toLocaleString()}</p>
                </div>
              </div>
              {locationLoading && (
                <div className="mt-2 text-xs text-orange-600 flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-orange-600 mr-2"></div>
                  Getting location...
                </div>
              )}
            </div>
          )}

          {!location && !locationLoading && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800">Location not captured</span>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="text-xs text-yellow-600 underline hover:text-yellow-700"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-orange-700 mb-2">
              Manufacturing Notes (optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Add any additional notes about this manufacturing process..."
              className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 px-6 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Recording Manufacturing...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>Record Manufacturing</span>
              </>
            )}
          </button>
        </form>

        {/* QR Scanner Modal */}
        {showQRScanner && (
          <QRScanner
            title="Scan QR Code from Processing"
            onScanSuccess={handleQRScanSuccess}
            onClose={() => setShowQRScanner(false)}
          />
        )}
      </div>
    </div>
  );
};

export default ManufacturingForm;