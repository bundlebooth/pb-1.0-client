import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';
import { showBanner } from '../../../utils/helpers';
import { DeleteButton } from '../../common/UIComponents';
import { ConfirmationModal } from '../../UniversalModal';

/**
 * QuestionsAnswersPanel - Panel for managing Custom FAQs
 */
function QuestionsAnswersPanel({ onBack, vendorProfileId }) {
  const { currentUser } = useAuth();
  
  // Custom FAQs state
  const [faqs, setFaqs] = useState([]);
  const [loadingFaqs, setLoadingFaqs] = useState(true);
  const [newFaq, setNewFaq] = useState({ question: '', answers: [''] });
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [faqToDelete, setFaqToDelete] = useState(null);

  useEffect(() => {
    loadFAQs();
  }, [vendorProfileId]);

  const loadFAQs = async () => {
    try {
      setLoadingFaqs(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/faqs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const faqsArray = Array.isArray(data) ? data : (data.faqs || []);
        setFaqs(faqsArray.map(faq => ({
          id: faq.id || faq.FAQID,
          question: faq.question || faq.Question,
          answer: faq.answer || faq.Answer,
          displayOrder: faq.displayOrder || faq.DisplayOrder
        })));
      }
    } catch (error) {
      console.error('Error loading FAQs:', error);
    } finally {
      setLoadingFaqs(false);
    }
  };

  const handleAddFAQ = async (e) => {
    e.preventDefault();
    
    const validAnswers = newFaq.answers.filter(a => a.trim());
    if (!newFaq.question || validAnswers.length === 0) {
      showBanner('Please fill in the question and at least one answer', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const existingResponse = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/faqs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const existingData = existingResponse.ok ? await existingResponse.json() : { faqs: [] };
      const existingFaqs = existingData.faqs || [];
      
      // Join multiple answers with line breaks for storage
      const combinedAnswer = validAnswers.join('\n\n');
      const updatedFaqs = [...existingFaqs, { question: newFaq.question, answer: combinedAnswer }];
      
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/faqs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ faqs: updatedFaqs })
      });
      
      if (response.ok) {
        showBanner('FAQ added successfully!', 'success');
        setNewFaq({ question: '', answers: [''] });
        setShowAddForm(false);
        loadFAQs();
      } else {
        throw new Error('Failed to add FAQ');
      }
    } catch (error) {
      console.error('Error adding FAQ:', error);
      showBanner('Failed to add FAQ', 'error');
    }
  };

  const addAnswerField = () => {
    setNewFaq(prev => ({ ...prev, answers: [...prev.answers, ''] }));
  };

  const removeAnswerField = (index) => {
    if (newFaq.answers.length > 1) {
      setNewFaq(prev => ({
        ...prev,
        answers: prev.answers.filter((_, i) => i !== index)
      }));
    }
  };

  const updateAnswer = (index, value) => {
    setNewFaq(prev => ({
      ...prev,
      answers: prev.answers.map((a, i) => i === index ? value : a)
    }));
  };

  const handleDeleteFAQ = (faqId) => {
    setFaqToDelete(faqId);
    setShowDeleteModal(true);
  };

  const confirmDeleteFAQ = async () => {
    if (!faqToDelete) return;
    setShowDeleteModal(false);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/vendors/${vendorProfileId}/faqs/${faqToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showBanner('FAQ deleted successfully!', 'success');
        loadFAQs();
      }
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      showBanner('Failed to delete FAQ', 'error');
    } finally {
      setFaqToDelete(null);
    }
  };

  const renderCategoryQuestion = (question) => {
    const answer = categoryAnswers[question.QuestionID] || '';
    
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
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

  const isLoading = activeTab === 'category' ? loadingCategory : loadingFaqs;

  return (
    <div>
      <button className="btn btn-outline back-to-menu-btn" style={{ marginBottom: '1rem' }} onClick={onBack}>
        <i className="fas fa-arrow-left"></i> Back to Business Profile Menu
      </button>
      
      <div className="dashboard-card">
        <h2 className="dashboard-card-title">Questions & Answers</h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Answer category questions and create custom FAQs.
        </p>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0' }}>
          <button
            onClick={() => setActiveTab('category')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: activeTab === 'category' ? 600 : 400,
              color: activeTab === 'category' ? '#5086E8' : '#6b7280',
              borderBottom: activeTab === 'category' ? '2px solid #5086E8' : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-clipboard-list" style={{ marginRight: '0.5rem' }}></i>
            Category Questions
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '0.95rem',
              fontWeight: activeTab === 'custom' ? 600 : 400,
              color: activeTab === 'custom' ? '#5086E8' : '#6b7280',
              borderBottom: activeTab === 'custom' ? '2px solid #5086E8' : '2px solid transparent',
              marginBottom: '-1px',
              transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-question-circle" style={{ marginRight: '0.5rem' }}></i>
            Custom FAQs
          </button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        ) : (
          <>
            {/* Category Questions Tab */}
            {activeTab === 'category' && (
              <div>
                {!primaryCategory ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem', 
                    background: '#f9fafb', 
                    borderRadius: '12px',
                    border: '1px dashed #d1d5db'
                  }}>
                    <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
                      Please select a primary category first.
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>
                      Go to Business Information to set your primary category.
                    </p>
                  </div>
                ) : categoryQuestions.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem', 
                    background: '#f9fafb', 
                    borderRadius: '12px',
                    border: '1px dashed #d1d5db'
                  }}>
                    <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
                      No questions available for <strong>{primaryCategory}</strong> category yet.
                    </p>
                  </div>
                ) : (
                  <>
                    <p style={{ marginBottom: '1.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                      Answer these questions specific to your <strong>{primaryCategory}</strong> category.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      {categoryQuestions.map((question) => (
                        <div 
                          key={question.QuestionID}
                          style={{
                            padding: '1.25rem',
                            background: 'white',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb'
                          }}
                        >
                          <div style={{ marginBottom: '0.75rem' }}>
                            <span style={{ fontWeight: 500, color: '#111827' }}>
                              {question.QuestionText}
                            </span>
                            {question.IsRequired && (
                              <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>
                            )}
                          </div>
                          {renderCategoryQuestion(question)}
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '1.5rem' }}>
                      <button
                        onClick={handleSaveCategoryAnswers}
                        disabled={savingCategory}
                        className="btn btn-primary"
                      >
                        {savingCategory ? 'Saving...' : 'Save Answers'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Custom FAQs Tab */}
            {activeTab === 'custom' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
                    Create your own frequently asked questions to help clients.
                  </p>
                  <button 
                    className={showAddForm ? 'btn btn-outline' : 'btn btn-primary'}
                    onClick={() => setShowAddForm(!showAddForm)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'}`}></i>
                    {showAddForm ? 'Cancel' : 'Add FAQ'}
                  </button>
                </div>

                {/* Add FAQ Form */}
                {showAddForm && (
                  <div style={{ 
                    padding: '1.5rem', 
                    background: '#f9fafb', 
                    borderRadius: '12px', 
                    marginBottom: '1.5rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Add New FAQ</h4>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Question</label>
                      <input
                        type="text"
                        value={newFaq.question}
                        onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                        placeholder="e.g., What is your cancellation policy?"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.95rem'
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label style={{ fontWeight: 500 }}>Answers</label>
                        <button
                          type="button"
                          onClick={addAnswerField}
                          className="btn btn-outline"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          <i className="fas fa-plus" style={{ marginRight: '0.25rem' }}></i> Add Answer
                        </button>
                      </div>
                      {newFaq.answers.map((answer, index) => (
                        <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <textarea
                            value={answer}
                            onChange={(e) => updateAnswer(index, e.target.value)}
                            placeholder={`Answer ${index + 1}...`}
                            rows={3}
                            style={{
                              flex: 1,
                              padding: '0.75rem',
                              borderRadius: '8px',
                              border: '1px solid #d1d5db',
                              fontSize: '0.95rem',
                              resize: 'vertical'
                            }}
                          />
                          {newFaq.answers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAnswerField(index)}
                              style={{
                                padding: '0.5rem',
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                alignSelf: 'flex-start'
                              }}
                              title="Remove answer"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button onClick={handleAddFAQ} className="btn btn-primary">
                      Save FAQ
                    </button>
                  </div>
                )}

                {/* FAQs List */}
                {faqs.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '3rem', 
                    background: '#f9fafb', 
                    borderRadius: '12px',
                    border: '1px dashed #d1d5db'
                  }}>
                    <i className="fas fa-question-circle" style={{ fontSize: '2rem', color: '#d1d5db', marginBottom: '1rem' }}></i>
                    <p style={{ color: '#6b7280', fontSize: '1rem', margin: 0 }}>
                      No custom FAQs added yet.
                    </p>
                    <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      Click "Add FAQ" to create your first question.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {faqs.map((faq, index) => (
                      <div 
                        key={faq.id || index} 
                        style={{ 
                          padding: '1.25rem', 
                          border: '1px solid #e5e7eb', 
                          borderRadius: '12px', 
                          background: 'white' 
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', flex: 1 }}>
                            <span style={{ 
                              width: '28px', 
                              height: '28px', 
                              borderRadius: '50%', 
                              background: '#5086E8', 
                              color: 'white', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              flexShrink: 0
                            }}>
                              Q
                            </span>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                              {faq.question}
                            </h4>
                          </div>
                          <DeleteButton onClick={() => handleDeleteFAQ(faq.id)} title="Delete" />
                        </div>
                        <div style={{ paddingLeft: '2.75rem' }}>
                          <p style={{ margin: 0, color: '#6b7280', lineHeight: 1.6, fontSize: '0.95rem' }}>
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete FAQ Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setFaqToDelete(null); }}
        title="Delete FAQ"
        message="Are you sure you want to delete this FAQ?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteFAQ}
        variant="danger"
      />
    </div>
  );
}

export default QuestionsAnswersPanel;
