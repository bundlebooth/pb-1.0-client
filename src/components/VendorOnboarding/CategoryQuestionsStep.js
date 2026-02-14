import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { showBanner } from '../../utils/helpers';
import SelectableTile, { SelectableTileGroup } from '../common/SelectableTile';

/**
 * CategoryQuestionsStep - Displays category-specific questions for vendors to answer
 * Questions are loaded based on the vendor's selected primary category
 */
function CategoryQuestionsStep({ formData, setFormData, currentUser }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (formData.primaryCategory) {
      loadQuestions();
    } else {
      setQuestions([]);
      setLoading(false);
    }
  }, [formData.primaryCategory]);

  useEffect(() => {
    if (currentUser?.vendorProfileId) {
      loadExistingAnswers();
    }
  }, [currentUser?.vendorProfileId]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/vendors/category-questions/${encodeURIComponent(formData.primaryCategory)}`,
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
        `${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/category-answers`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        const answersMap = {};
        (data.answers || []).forEach(a => {
          answersMap[a.QuestionID] = a.Answer;
        });
        setAnswers(answersMap);
        // Also update formData
        setFormData(prev => ({ ...prev, categoryAnswers: answersMap }));
      }
    } catch (error) {
      console.error('Error loading existing answers:', error);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    setFormData(prev => ({ ...prev, categoryAnswers: newAnswers }));
  };

  const handleSaveAnswers = async () => {
    if (!currentUser?.vendorProfileId) {
      showBanner('Please complete your basic profile first', 'warning');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: parseInt(questionId),
        answer: answer
      }));

      const response = await fetch(
        `${API_BASE_URL}/vendors/${currentUser.vendorProfileId}/category-answers`,
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
        showBanner('Answers saved successfully!', 'success');
      } else {
        throw new Error('Failed to save answers');
      }
    } catch (error) {
      console.error('Error saving answers:', error);
      showBanner('Failed to save answers', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderQuestion = (question) => {
    const value = answers[question.QuestionID] || '';
    const isChecked = value === 'Yes' || value === 'true' || value === '1';
    
    switch (question.QuestionType) {
      case 'Checkbox':
      case 'YesNo':
        return (
          <label 
            key={question.QuestionID} 
            style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              background: isChecked ? '#f0fdf4' : '#fff',
              borderRadius: '8px',
              border: isChecked ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => handleAnswerChange(question.QuestionID, e.target.checked ? 'Yes' : 'No')}
              style={{ 
                width: '18px', 
                height: '18px', 
                accentColor: '#22c55e',
                cursor: 'pointer'
              }}
            />
            <span style={{ 
              fontSize: '0.95rem',
              color: isChecked ? '#166534' : '#374151',
              fontWeight: isChecked ? 500 : 400
            }}>
              {question.QuestionText}
            </span>
          </label>
        );

      case 'Select':
        const options = question.Options ? question.Options.split(',').map(o => o.trim()) : [];
        return (
          <div key={question.QuestionID} style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#111827' }}>
              {question.QuestionText}
            </label>
            <select
              value={value}
              onChange={(e) => handleAnswerChange(question.QuestionID, e.target.value)}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '1rem',
                background: 'white'
              }}
            >
              <option value="">Select an option</option>
              {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );

      case 'MultiSelect':
        const multiOptions = question.Options ? question.Options.split(',').map(o => o.trim()) : [];
        const selectedValues = value ? value.split(',').map(v => v.trim()) : [];
        return (
          <div key={question.QuestionID} style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500, color: '#111827' }}>
              {question.QuestionText}
            </label>
            <SelectableTileGroup>
              {multiOptions.map(opt => {
                const isSelected = selectedValues.includes(opt);
                return (
                  <SelectableTile
                    key={opt}
                    label={opt}
                    isSelected={isSelected}
                    onClick={() => {
                      const newValues = isSelected
                        ? selectedValues.filter(v => v !== opt)
                        : [...selectedValues, opt];
                      handleAnswerChange(question.QuestionID, newValues.join(','));
                    }}
                  />
                );
              })}
            </SelectableTileGroup>
          </div>
        );

      case 'Text':
      default:
        return (
          <div key={question.QuestionID} style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#111827' }}>
              {question.QuestionText}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleAnswerChange(question.QuestionID, e.target.value)}
              placeholder="Enter your answer"
              style={{
                width: '100%',
                maxWidth: '500px',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '1rem'
              }}
            />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="step-loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!formData.primaryCategory) {
    return (
      <div style={{ 
        padding: '2rem', 
        background: '#fef3c7', 
        borderRadius: '12px', 
        textAlign: 'center',
        color: '#92400e'
      }}>
        <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
        <p style={{ margin: 0, fontWeight: 500 }}>Please select a primary category first</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={{ 
        padding: '2rem', 
        background: '#f0f9ff', 
        borderRadius: '12px', 
        textAlign: 'center',
        color: '#0369a1'
      }}>
        <i className="fas fa-info-circle" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
        <p style={{ margin: 0, fontWeight: 500 }}>No specific questions for this category yet</p>
      </div>
    );
  }

  const handleMultiSelectChange = (questionId, option, checked) => {
    const currentAnswer = answers[questionId] || '';
    const currentOptions = currentAnswer ? currentAnswer.split(',').map(s => s.trim()) : [];
    
    let newOptions;
    if (checked) {
      newOptions = [...currentOptions, option];
    } else {
      newOptions = currentOptions.filter(o => o !== option);
    }
    
    handleAnswerChange(questionId, newOptions.join(','));
  };

  const renderQuestionInput = (question) => {
    const value = answers[question.QuestionID] || '';
    
    switch (question.QuestionType) {
      case 'Checkbox':
      case 'YesNo':
        const isOn = value === 'Yes' || value === 'true' || value === '1';
        return (
          <button
            type="button"
            onClick={() => handleAnswerChange(question.QuestionID, isOn ? 'No' : 'Yes')}
            style={{
              width: '48px',
              height: '26px',
              borderRadius: '13px',
              border: 'none',
              background: isOn ? '#5086E8' : '#d1d5db',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s ease',
              flexShrink: 0
            }}
          >
            <span style={{
              position: 'absolute',
              top: '3px',
              left: isOn ? '25px' : '3px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'left 0.2s ease'
            }} />
          </button>
        );

      case 'Select':
        const selectOptions = question.Options ? question.Options.split(',').map(o => o.trim()) : [];
        return (
          <select
            value={value}
            onChange={(e) => handleAnswerChange(question.QuestionID, e.target.value)}
            style={{
              minWidth: '200px',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
              background: 'white'
            }}
          >
            <option value="">Select...</option>
            {selectOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'MultiSelect':
        const multiOptions = question.Options ? question.Options.split(',').map(o => o.trim()) : [];
        const selectedOptions = value ? value.split(',').map(s => s.trim()) : [];
        return (
          <SelectableTileGroup>
            {multiOptions.map(opt => {
              const isSelected = selectedOptions.includes(opt);
              return (
                <SelectableTile
                  key={opt}
                  label={opt}
                  isSelected={isSelected}
                  onClick={() => handleMultiSelectChange(question.QuestionID, opt, !isSelected)}
                />
              );
            })}
          </SelectableTileGroup>
        );

      case 'Number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleAnswerChange(question.QuestionID, e.target.value)}
            placeholder="Enter number"
            style={{
              width: '120px',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.9rem'
            }}
          />
        );

      case 'Text':
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleAnswerChange(question.QuestionID, e.target.value)}
            placeholder="Enter answer"
            style={{
              minWidth: '200px',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              fontSize: '0.9rem'
            }}
          />
        );
    }
  };

  return (
    <div className="category-questions-step">
      <p style={{ margin: '0 0 1.5rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
        Answer these questions to help clients understand your services better
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {questions.map(question => (
          <div 
            key={question.QuestionID}
            style={{
              display: 'flex',
              alignItems: question.QuestionType === 'MultiSelect' ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              paddingBottom: '1.25rem',
              borderBottom: '1px solid #f3f4f6'
            }}
          >
            <span style={{ 
              fontWeight: 500, 
              color: '#111827',
              fontSize: '0.9rem',
              flex: question.QuestionType === 'MultiSelect' ? '0 0 40%' : '1'
            }}>
              {question.QuestionText}
              {question.IsRequired && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
            </span>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center',
              flex: question.QuestionType === 'MultiSelect' ? '1' : 'none'
            }}>
              {renderQuestionInput(question)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CategoryQuestionsStep;
