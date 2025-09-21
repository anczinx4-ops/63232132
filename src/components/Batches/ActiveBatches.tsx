import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Eye, 
  QrCode,
  Calendar,
  User,
  MapPin,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import blockchainService from '../../services/blockchainService';

const ActiveBatches: React.FC = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchActiveBatches();
    
    // Set up real-time updates
    const handleDataUpdate = () => {
      fetchActiveBatches();
    };
    
    window.addEventListener('herbionyx-data-update', handleDataUpdate);
    
    // Also refresh every 5 seconds as backup
    const interval = setInterval(fetchActiveBatches, 5000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('herbionyx-data-update', handleDataUpdate);
    };
  }, []);

  const fetchActiveBatches = async () => {
    try {
      const allBatches = await blockchainService.getAllBatches();
      
      // Show all batches but mark completed ones
      const activeBatches = allBatches;

      // Sort by last updated (most recent first)
      activeBatches.sort((a: any, b: any) => 
        new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
      );

      setBatches(activeBatches);
    } catch (error) {
      console.error('Error fetching active batches:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COLLECTED': return 'bg-green-100 text-green-800 border-green-200';
      case 'QUALITY_TESTED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PROCESSED': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COLLECTED': return <CheckCircle className="h-4 w-4" />;
      case 'QUALITY_TESTED': return <CheckCircle className="h-4 w-4" />;
      case 'PROCESSED': return <CheckCircle className="h-4 w-4" />;
      case 'IN_PROGRESS': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getNextStep = (status: string) => {
    switch (status) {
      case 'COLLECTED': return 'Ready for Quality Testing';
      case 'QUALITY_TESTED': return 'Ready for Processing';
      case 'PROCESSED': return 'Ready for Manufacturing';
      case 'MANUFACTURED': return 'Supply Chain Complete';
      default: return 'In Progress';
    }
  };

  const canUserAccess = (batch: any) => {
    if (!user) return false;
    
    // Admin can access all
    if (user.role === 5) return true;
    
    // Consumer can access all for verification
    if (user.role === 6) return true;
    
    // Role-based access based on current status
    switch (batch.currentStatus) {
      case 'COLLECTED':
        return user.role === 2; // Testers can access collected batches
      case 'QUALITY_TESTED':
        return user.role === 3; // Processors can access tested batches
      case 'PROCESSED':
        return user.role === 4; // Manufacturers can access processed batches
      default:
        return true; // Allow access to in-progress batches
    }
  };

  const filteredBatches = batches.filter(batch => {
    if (filter === 'all') return true;
    if (filter === 'accessible') return canUserAccess(batch);
    if (filter === 'manufactured') return batch.currentStatus === 'MANUFACTURED';
    return batch.currentStatus.toLowerCase() === filter.toLowerCase();
  });

  // Sort batches: incomplete batches first, then completed batches
  const sortedBatches = filteredBatches.sort((a, b) => {
    // If one is completed and other is not, incomplete comes first
    if (a.currentStatus === 'MANUFACTURED' && b.currentStatus !== 'MANUFACTURED') return 1;
    if (a.currentStatus !== 'MANUFACTURED' && b.currentStatus === 'MANUFACTURED') return -1;
    
    // Among incomplete batches, sort by last updated (most recent first)
    if (a.currentStatus !== 'MANUFACTURED' && b.currentStatus !== 'MANUFACTURED') {
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    }
    
    // Among completed batches, sort by last updated (most recent first)
    return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
  });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading active batches...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-800">Batches</h2>
              <p className="text-green-600">All batches in the supply chain</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
            >
              <option value="all">All Batches</option>
              <option value="accessible">Accessible to Me</option>
              <option value="collected">Collected</option>
              <option value="quality_tested">Quality Tested</option>
              <option value="processed">Processed</option>
              <option value="manufactured">Completed</option>
            </select>
            
            <button
              onClick={fetchActiveBatches}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        {sortedBatches.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Batches Found</h3>
            <p className="text-gray-600">
              {filter === 'accessible' 
                ? 'No batches are currently accessible for your role'
                : filter === 'manufactured'
                  ? 'No completed batches found.'
                  : 'No batches found. Create a new collection to get started.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedBatches.map((batch) => (
              <div
                key={batch.batchId}
                className={`bg-white border-2 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200 ${
                  batch.currentStatus === 'MANUFACTURED' 
                    ? 'border-green-200 bg-green-50' 
                    : canUserAccess(batch) 
                      ? 'border-blue-200 hover:border-blue-300' 
                      : 'border-gray-200'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(batch.currentStatus)}`}>
                      {getStatusIcon(batch.currentStatus)}
                      <span className="ml-1">{batch.currentStatus.replace('_', ' ')}</span>
                    </span>
                  </div>
                  {canUserAccess(batch) && (
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-600 font-medium">Accessible</span>
                    </div>
                  )}
                </div>

                {/* Batch Info */}
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{batch.herbSpecies}</h3>
                    <p className="text-sm text-gray-600 font-mono">{batch.batchId}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{batch.creator}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{batch.eventCount} events</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      Updated: {new Date(batch.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Next Step */}
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        {getNextStep(batch.currentStatus)}
                      </span>
                    </div>
                  </div>

                  {/* Latest Event */}
                  {batch.events && batch.events.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-xs text-gray-500 mb-1">Latest Event:</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {batch.events[batch.events.length - 1].eventType.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(batch.events[batch.events.length - 1].timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => {
                        // Show batch details in a modal or navigate to tracking
                        const batchDetails = {
                          ...batch,
                          events: batch.events || []
                        };
                        
                        // Create a detailed view modal
                        const modal = document.createElement('div');
                        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
                        modal.innerHTML = `
                          <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-auto p-6">
                            <div class="flex items-center justify-between mb-6">
                              <h2 class="text-2xl font-bold text-gray-900">Batch Details: ${batch.herbSpecies}</h2>
                              <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                              </button>
                            </div>
                            
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                              <div class="bg-gray-50 p-4 rounded-lg">
                                <h3 class="font-semibold text-gray-700">Batch ID</h3>
                                <p class="font-mono text-sm">${batch.batchId}</p>
                              </div>
                              <div class="bg-gray-50 p-4 rounded-lg">
                                <h3 class="font-semibold text-gray-700">Status</h3>
                                <p class="font-semibold ${batch.currentStatus === 'MANUFACTURED' ? 'text-green-600' : 'text-blue-600'}">${batch.currentStatus}</p>
                              </div>
                              <div class="bg-gray-50 p-4 rounded-lg">
                                <h3 class="font-semibold text-gray-700">Events</h3>
                                <p class="font-semibold">${batch.eventCount} completed</p>
                              </div>
                            </div>
                            
                            <div class="space-y-4">
                              <h3 class="text-lg font-semibold">Supply Chain Journey</h3>
                              ${batch.events.map((event: any, index: number) => `
                                <div class="border-l-4 border-blue-500 pl-4 py-2">
                                  <div class="flex items-center justify-between">
                                    <h4 class="font-semibold">${event.eventType.replace('_', ' ')}</h4>
                                    <span class="text-sm text-gray-500">${new Date(event.timestamp).toLocaleString()}</span>
                                  </div>
                                  <p class="text-gray-600">${event.participant} - ${event.organization}</p>
                                  ${event.data ? `<p class="text-sm text-gray-500 mt-1">${JSON.stringify(event.data).substring(0, 100)}...</p>` : ''}
                                </div>
                              `).join('')}
                            </div>
                          </div>
                        `;
                        document.body.appendChild(modal);
                      }}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </button>
                    
                    {canUserAccess(batch) && (
                      <button
                        onClick={() => {
                          // Copy batch ID to clipboard for easy use
                          navigator.clipboard.writeText(batch.batchId);
                          // Show toast notification
                          const toast = document.createElement('div');
                          toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
                          toast.textContent = 'Batch ID copied to clipboard!';
                          document.body.appendChild(toast);
                          setTimeout(() => toast.remove(), 2000);
                        }}
                        className="flex-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium flex items-center justify-center space-x-1"
                      >
                        <QrCode className="h-4 w-4" />
                        <span>Use</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-800">
              {batches.filter(b => b.currentStatus === 'COLLECTED').length}
            </div>
            <div className="text-sm text-green-600">Collected</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-800">
              {batches.filter(b => b.currentStatus === 'QUALITY_TESTED').length}
            </div>
            <div className="text-sm text-blue-600">Quality Tested</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-800">
              {batches.filter(b => b.currentStatus === 'PROCESSED').length}
            </div>
            <div className="text-sm text-purple-600">Processed</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-800">
              {batches.filter(b => b.currentStatus === 'MANUFACTURED').length}
            </div>
            <div className="text-sm text-orange-600">Completed</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveBatches;