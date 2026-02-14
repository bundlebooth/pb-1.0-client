import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';
import { showBanner } from '../../../utils/helpers';

/**
 * CategoryQuestionsPanel - Dashboard panel for vendors to answer category-specific questions
 */
function CategoryQuestionsPanel({ onBack, vendorProfileId }) {
  const { currentUser } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [primaryCategory, setPrimaryCategory] = useState(null);

  useEffect(() => {
    loadVendorCategory();
  }, [vendorProfileId]);

  useEffect(() => {
    if (primaryCategory) {
      loadQuestions();
      loadExistingAnswers();
    }
  }, [primaryCategory]);

  const loadVendorCategory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const categories = data.data?.categories || [];
        const primary = categories.find(c => c.IsPrimary) || categories[0];
        if (primary) {
          setPrimaryCategory(primary.Category);
        } else {
          // No primary category found, stop loading
          setLoading(false);
        }
      } else {
        // Request failed, stop loading
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading vendor category:', error);
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/vendors/category-questions/${encodeURIComponent(primaryCategory)}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Error loading category questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAnswers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/vendors/${vendorProfileId}/category-answers`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        const answersMap = {};
        (data.answers || []).forEach(a => {
          answersMap[a.QuestionID] = a.Answer;
        });
        setAnswers(answersMap);
      }
    } catch (error) {
      console.error('Error loading existing answers:', error);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultiSelectChange = (questionId, option, checked) => {
    const currentAnswer = answers[questionId] || '';
    const currentOptions = currentAnswer ? currentAnswer.split(',').map(s => s.trim()) : [];
    
    let newOptions;
    if (checked) {
      newOptions = [...currentOptions, option];
    } else {
      newOptions = currentOptions.filter(o => o !== option);
    }
    
    setAnswers(prev => ({ ...prev, [questionId]: newOptions.join(',') }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: parseInt(questionId),
        answer: answer
      }));

      const response = await fetch(
        `${API_BASE_URL}/vendors/${vendorProfileId}/category-answers`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ answers: answersArray })
        }
      );

      if (response.ok) {
        showBanner('Category answers saved successfully!', 'success');
      } else {
        throw new Error('Failed to save answers');
      }
    } catch (error) {
      console.error('Error saving answers:', error);
      showBanner('Failed to save answers. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderQuestion = (question) => {
    const answer = answers[question.QuestionID] || '';
    
    switch (question.QuestionType) {
      case 'YesNo':
        return (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name={`q_${question.QuestionID}`}
                checked={answer === 'Yes'}
                onChange={() => handleAnswerChange(question.QuestionID, 'Yes')}
                style={{ width: '18px', height: '18px', accentColor: '#5086E8' }}
              />
              <span>Yes</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="radio"
                name={`q_${question.QuestionID}`}
                checked={answer === 'No'}
                onChange={() => handleAnswerChange(question.QuestionID, 'No')}
                style={{ width: '18px', height: '18px', accentColor: '#5086E8' }}
              />
              <span>No</span>
            </label>
          </div>
        );

      case 'Select':
        const selectOptions = question.Options ? question.Options.split(',').map(o => o.trim()) : [];
        return (
          <select
            value={answer}
            onChange={(e) => handleAnswerChange(question.QuestionID, e.target.value)}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.95rem',
              background: 'white'
            }}
          >
            <option value="">Select an option...</option>
            {selectOptions.map((opt, idx) => (
              <option key={idx} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'MultiSelect':
        const multiOptions = question.Options ? question.Options.split(',').map(o => o.trim()) : [];
        const selectedOptions = answer ? answer.split(',').map(s => s.trim()) : [];
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {multiOptions.map((opt, idx) => (
              <label 
                key={idx} 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  background: selectedOptions.includes(opt) ? '#f3f4f6' : 'white',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedOptions.includes(opt)}
                  onChange={(e) => handleMultiSelectChange(question.QuestionID, opt, e.target.checked)}
                  style={{ display: 'none' }}
                />
                <span>{opt}</span>
                {selectedOptions.includes(opt) && (
                  <span style={{ color: '#9ca3af', fontSize: '0.875rem', marginLeft: '0.125rem' }}>×</span>
                )}
              </label>
            ))}
          </div>
        );

      case 'Number':
        return (
          <input
            type="number"
            value={answer}
            onChange={(e) => handleAnswerChange(question.QuestionID, e.target.value)}
            placeholder="Enter a number"
            style={{
              width: '100%',
              maxWidth: '200px',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.95rem'
            }}
          />
        );

      case 'Text':
      default:
        return (
          <textarea
            value={answer}
            onChange={(e) => handleAnswerChange(question.QuestionID, e.target.value)}
            placeholder="Enter your answer..."
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.95rem',
              resize: 'vertical'
            }}
          />
        );
    }
  };

  if (loading) {
    return (
      <div>
        <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
          <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
        </button>
        <div className="dashboard-card">
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
        <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
      </button>
      <div className="dashboard-card">
        <h2 className="dashboard-card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fas fa-clipboard-list" style={{ color: 'var(--primary)' }}></i>
          Category Questions
        </h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Answer these questions specific to your <strong>{primaryCategory}</strong> category. 
          This helps clients understand your services better.
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '1.5rem 0' }} />

      {questions.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem', 
          background: '#f9fafb', 
          borderRadius: '12px',
          border: '1px dashed #d1d5db'
        }}>
          <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
            No questions available for your category yet.
          </p>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
            Please make sure you have selected a primary category.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {questions.map((question, index) => (
              <div 
                key={question.QuestionID}
                style={{
                  padding: '1.5rem',
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontWeight: 500, color: '#111827' }}>
                    {question.QuestionText}
                  </span>
                  {question.IsRequired && (
                    <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>
                  )}
                </div>
                {renderQuestion(question)}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '2rem' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

export default CategoryQuestionsPanel;
