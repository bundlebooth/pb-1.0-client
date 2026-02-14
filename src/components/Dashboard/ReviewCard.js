import React from 'react';

/**
 * Shared ReviewCard component for consistent review card styling
 * Used in: ClientReviewsSection (My Reviews), VendorReviewsSection (In-App & Google Reviews)
 * 
 * Props:
 * - reviewerName: Name of the reviewer (vendor name for client view, client name for vendor view)
 * - rating: Overall rating (1-5)
 * - comment: Review comment text
 * - surveyRatings: Array of { label, value } for detailed ratings (Quality, Communication, etc.)
 * - wouldRecommend: Boolean or undefined - whether reviewer would recommend
 * - isGoogle: Boolean - if true, renders Google review style with avatar
 * - profilePhoto: URL for Google reviewer's profile photo
 * - relativeTime: String like "2 weeks ago" for Google reviews
 */

const ReviewCard = ({
  reviewerName = 'Reviewer',
  rating = 5,
  comment,
  surveyRatings = [],
  wouldRecommend,
  isGoogle = false,
  profilePhoto,
  relativeTime
}) => {
  // Filter out empty survey ratings
  const validSurveyRatings = surveyRatings.filter(r => r.value != null && r.value > 0);

  return (
    <div 
      style={{
        padding: '20px',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        marginBottom: '12px',
        background: '#fff'
      }}
    >
      {/* Header: Different layout for Google vs In-App */}
      {isGoogle ? (
        <>
          {/* Google Review Header - Avatar left, Name/Time right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {profilePhoto ? (
                <img 
                  src={profilePhoto} 
                  alt={reviewerName} 
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: '#5e72e4', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '16px'
                }}>
                  {reviewerName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>{reviewerName}</div>
              {relativeTime && (
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{relativeTime}</div>
              )}
            </div>
          </div>
          {/* Star Rating */}
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#5e72e4', fontSize: '14px' }}>
              {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
            </span>
          </div>
        </>
      ) : (
        <>
          {/* In-App Review Header - Name left, Rating right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: '15px' }}>
              {reviewerName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#5e72e4', fontSize: '14px' }}>
                {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
              </span>
              <span style={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>{rating}/5</span>
            </div>
          </div>
        </>
      )}

      {/* Comment */}
      {comment && (
        <div style={{ 
          color: '#374151', 
          fontSize: '14px', 
          lineHeight: 1.6, 
          marginBottom: (validSurveyRatings.length > 0 || wouldRecommend !== undefined) ? '12px' : '0'
        }}>
          {comment}
        </div>
      )}

      {/* Detailed Ratings - only for in-app reviews */}
      {!isGoogle && (validSurveyRatings.length > 0 || wouldRecommend !== undefined) && (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '12px', 
          padding: '12px', 
          background: '#f9fafb', 
          borderRadius: '8px'
        }}>
          {validSurveyRatings.map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>{r.label}:</span>
              <span style={{ color: '#5e72e4', fontSize: '12px' }}>
                {'★'.repeat(r.value)}{'☆'.repeat(5 - r.value)}
              </span>
            </div>
          ))}
          {wouldRecommend !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Would Recommend:</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: wouldRecommend ? '#10b981' : '#ef4444' }}>
                {wouldRecommend ? 'Yes' : 'No'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewCard;
