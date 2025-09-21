import React, { useState } from 'react';
import { Star, Send, MessageSquare, TrendingUp } from 'lucide-react';

const PlatformRating: React.FC = () => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [platformStats, setPlatformStats] = useState({ totalRatings: 0, averageRating: 0, totalReviews: 0 });

  useEffect(() => {
    loadPlatformStats();
  }, []);

  const loadPlatformStats = () => {
    const existingRatings = JSON.parse(localStorage.getItem('platformRatings') || '[]');
    const totalRatings = existingRatings.length;
    const averageRating = totalRatings > 0 
      ? existingRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / totalRatings 
      : 0;
    
    setPlatformStats({
      totalRatings,
      averageRating,
      totalReviews: totalRatings
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate submission
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Store in localStorage for demo
    const existingRatings = JSON.parse(localStorage.getItem('platformRatings') || '[]');
    existingRatings.push({
      rating,
      feedback,
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    });
    localStorage.setItem('platformRatings', JSON.stringify(existingRatings));
    
    setSubmitted(true);
    loadPlatformStats(); // Refresh stats after submission
  };

  const handleReset = () => {
    setRating(0);
    setFeedback('');
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Thank You!</h2>
          <p className="text-green-600 mb-6">Your feedback has been submitted successfully</p>
          <button
            onClick={handleReset}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-6 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
          >
            Submit Another Rating
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg">
            <Star className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-yellow-800">Rate Platform</h2>
            <p className="text-yellow-600">Share your experience with HerbionYX</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Star Rating */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">How would you rate your experience?</h3>
            <div className="flex justify-center space-x-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="p-2 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredStar || rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-600">
              {rating === 0 && 'Click to rate'}
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share your feedback (optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="Tell us about your experience with the platform..."
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              disabled={rating === 0}
              className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-3 px-8 rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto"
            >
              <Send className="h-5 w-5" />
              <span>Submit Rating</span>
            </button>
          </div>
        </form>

        {/* Platform Statistics */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Platform Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-800">
                {platformStats.averageRating > 0 ? platformStats.averageRating.toFixed(1) : '0'}
              </div>
              <div className="text-sm text-green-600">Average Rating</div>
              <div className="flex justify-center mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${star <= Math.round(platformStats.averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                  />
                ))}
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-800">{platformStats.totalReviews}</div>
              <div className="text-sm text-blue-600">Total Reviews</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-800">
                {platformStats.totalRatings > 0 
                  ? Math.round((platformStats.totalRatings / platformStats.totalRatings) * 100) 
                  : 0}%
              </div>
              <div className="text-sm text-purple-600">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformRating;