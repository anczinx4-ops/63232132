import React, { useState, useEffect } from 'react';
import { Search, Package, Eye, Calendar, User, MapPin, FileText, QrCode } from 'lucide-react';
import blockchainService from '../../services/blockchainService';

const BatchTracker: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Set up real-time updates
  useEffect(() => {
    const handleDataUpdate = () => {
      // Refresh current search if we have one
      if (searchQuery && searchResult) {
        handleSearch(new Event('submit') as any, true);
      }
    };
    
    window.addEventListener('herbionyx-data-update', handleDataUpdate);
    return () => window.removeEventListener('herbionyx-data-update', handleDataUpdate);
  }, [searchQuery, searchResult]);

  const handleSearch = async (e: React.FormEvent, skipFormCheck = false) => {
    if (!skipFormCheck) {
      e.preventDefault();
      if (!searchQuery.trim()) return;
    }

    setLoading(true);
    setError('');
    if (!skipFormCheck) setSearchResult(null);

    try {
      // Try to get batch info by event ID or batch ID
      const queryId = skipFormCheck ? searchQuery : searchQuery.trim();
      const result = await blockchainService.getBatchInfo(queryId);
      setSearchResult(result.batch);
    } catch (error) {
      console.error('Search error:', error);
      if (!skipFormCheck) {
        setError('Batch not found. Please check the Batch ID or Event ID.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COLLECTED': return 'bg-green-100 text-green-800';
      case 'QUALITY_TESTED': return 'bg-blue-100 text-blue-800';
      case 'PROCESSED': return 'bg-purple-100 text-purple-800';
      case 'MANUFACTURED': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'COLLECTION': return <Package className="h-4 w-4 text-green-600" />;
      case 'QUALITY_TEST': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'PROCESSING': return <Package className="h-4 w-4 text-purple-600" />;
      case 'MANUFACTURING': return <Package className="h-4 w-4 text-orange-600" />;
      default: return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
            <Search className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-blue-800">Track Batch</h2>
            <p className="text-blue-600">Search and track batches by Batch ID or Event ID</p>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Batch ID (HERB-...) or Event ID (COLLECTION-..., TEST-..., etc.)"
                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  <span>Track</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Search Results */}
        {searchResult && (
          <div className="space-y-8">
            {/* Batch Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-blue-800">{searchResult.herbSpecies}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(searchResult.currentStatus)}`}>
                  {searchResult.currentStatus}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-600">Batch ID</span>
                  <p className="text-blue-900 font-mono">{searchResult.batchId}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-600">Creator</span>
                  <p className="text-blue-900">{searchResult.creator}</p>
                </div>
                <div>
                  <span className="font-medium text-blue-600">Total Events</span>
                  <p className="text-blue-900">{searchResult.events?.length || 0}</p>
                </div>
              </div>
            </div>

            {/* Events Timeline */}
            <div>
              <h4 className="text-lg font-semibold text-gray-800 mb-6">Supply Chain Journey</h4>
              <div className="space-y-6">
                {searchResult.events?.map((event: any, index: number) => (
                  <div key={event.eventId} className="relative">
                    {index < searchResult.events.length - 1 && (
                      <div className="absolute left-6 top-16 w-0.5 h-16 bg-gray-200"></div>
                    )}
                    
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border-2 border-gray-200 shadow-sm">
                        {getEventTypeIcon(event.eventType)}
                      </div>
                      
                      <div className="flex-1 bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="font-semibold text-gray-900">{event.eventType.replace('_', ' ')}</h5>
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <User className="h-4 w-4 mr-2" />
                            <span className="font-medium">{event.participant}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <QrCode className="h-4 w-4 mr-2" />
                            <span className="font-mono text-xs">{event.eventId}</span>
                          </div>
                        </div>

                        {/* Event-specific details */}
                        {event.eventType === 'COLLECTION' && (
                          <div className="bg-green-50 rounded-lg p-4">
                            <h6 className="font-medium text-green-800 mb-2">Collection Details</h6>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div><span className="font-medium">Weight:</span> {event.data?.weight}g</div>
                              <div><span className="font-medium">Quality:</span> {event.data?.qualityGrade}</div>
                              <div className="col-span-2"><span className="font-medium">Zone:</span> {event.data?.location?.zone}</div>
                            </div>
                          </div>
                        )}

                        {event.eventType === 'QUALITY_TEST' && (
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h6 className="font-medium text-blue-800 mb-2">Test Results</h6>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div><span className="font-medium">Moisture:</span> {event.data?.moistureContent}%</div>
                              <div><span className="font-medium">Purity:</span> {event.data?.purity}%</div>
                              <div><span className="font-medium">Pesticide:</span> {event.data?.pesticideLevel} ppm</div>
                            </div>
                          </div>
                        )}

                        {event.eventType === 'PROCESSING' && (
                          <div className="bg-purple-50 rounded-lg p-4">
                            <h6 className="font-medium text-purple-800 mb-2">Processing Details</h6>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div><span className="font-medium">Method:</span> {event.data?.method}</div>
                              <div><span className="font-medium">Yield:</span> {event.data?.yield}g</div>
                              {event.data?.temperature && <div><span className="font-medium">Temperature:</span> {event.data.temperature}°C</div>}
                              {event.data?.duration && <div><span className="font-medium">Duration:</span> {event.data.duration}</div>}
                            </div>
                          </div>
                        )}

                        {event.eventType === 'MANUFACTURING' && (
                          <div className="bg-orange-50 rounded-lg p-4">
                            <h6 className="font-medium text-orange-800 mb-2">Product Details</h6>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div><span className="font-medium">Product:</span> {event.data?.productName}</div>
                              <div><span className="font-medium">Type:</span> {event.data?.productType}</div>
                              <div><span className="font-medium">Quantity:</span> {event.data?.quantity} {event.data?.unit}</div>
                              {event.data?.expiryDate && <div><span className="font-medium">Expiry:</span> {event.data.expiryDate}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Demo Instructions */}
        {!searchResult && !loading && (
          <div className="text-center py-12">
            <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Track Any Batch</h3>
            <p className="text-gray-600 mb-4">
              Enter a Batch ID or Event ID to view the complete supply chain journey
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchTracker;