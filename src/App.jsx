import { useState, useEffect } from 'react'

function App() {
  const [subjects, setSubjects] = useState([])
  const [newSubject, setNewSubject] = useState({
    name: '',
    totalClasses: '',
    attendedClasses: ''
  })

  // Load data from localStorage on mount
  useEffect(() => {
    const savedSubjects = localStorage.getItem('attendanceData')
    if (savedSubjects) {
      setSubjects(JSON.parse(savedSubjects))
    }
  }, [])

  // Save data to localStorage whenever subjects change
  useEffect(() => {
    if (subjects.length > 0) {
      localStorage.setItem('attendanceData', JSON.stringify(subjects))
    }
  }, [subjects])

  // Calculate attendance percentage
  const calculatePercentage = (attended, total) => {
    if (total === 0) return 0
    return Math.round((attended / total) * 100)
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewSubject(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Add new subject
  const handleAddSubject = (e) => {
    e.preventDefault()
    
    if (!newSubject.name.trim()) {
      alert('Please enter a subject name')
      return
    }

    const totalClasses = parseInt(newSubject.totalClasses) || 0
    const attendedClasses = parseInt(newSubject.attendedClasses) || 0

    if (totalClasses < 0 || attendedClasses < 0) {
      alert('Please enter valid numbers')
      return
    }

    if (attendedClasses > totalClasses) {
      alert('Attended classes cannot be more than total classes')
      return
    }

    const subject = {
      id: Date.now(),
      name: newSubject.name.trim(),
      totalClasses,
      attendedClasses,
      percentage: calculatePercentage(attendedClasses, totalClasses)
    }

    setSubjects(prev => [...prev, subject])
    setNewSubject({ name: '', totalClasses: '', attendedClasses: '' })
  }

  // Update attendance for existing subject
  const handleUpdateAttendance = (id, attended, total) => {
    const attendedNum = parseInt(attended) || 0
    const totalNum = parseInt(total) || 0

    if (attendedNum < 0 || totalNum < 0) {
      alert('Please enter valid numbers')
      return
    }

    if (attendedNum > totalNum) {
      alert('Attended classes cannot be more than total classes')
      return
    }

    setSubjects(prev =>
      prev.map(subject =>
        subject.id === id
          ? {
              ...subject,
              totalClasses: totalNum,
              attendedClasses: attendedNum,
              percentage: calculatePercentage(attendedNum, totalNum)
            }
          : subject
      )
    )
  }

  // Delete subject
  const handleDeleteSubject = (id) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      setSubjects(prev => prev.filter(subject => subject.id !== id))
      // Update localStorage after deletion
      const updatedSubjects = subjects.filter(subject => subject.id !== id)
      if (updatedSubjects.length === 0) {
        localStorage.removeItem('attendanceData')
      } else {
        localStorage.setItem('attendanceData', JSON.stringify(updatedSubjects))
      }
    }
  }

  // Get color class based on percentage
  const getPercentageClass = (percentage) => {
    if (percentage >= 75) return ''
    if (percentage >= 60) return 'medium'
    return 'low'
  }

  return (
    <div className="app">
      <div className="header">
        <h1>📚 Attendance Tracker</h1>
        <p>Track your class attendance easily</p>
      </div>

      <div className="content">
        <div className="add-subject-form">
          <h2>Add New Subject</h2>
          <form onSubmit={handleAddSubject}>
            <div className="form-group">
              <label htmlFor="name">Subject Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={newSubject.name}
                onChange={handleInputChange}
                placeholder="e.g., Mathematics"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="totalClasses">Total Classes</label>
              <input
                type="number"
                id="totalClasses"
                name="totalClasses"
                value={newSubject.totalClasses}
                onChange={handleInputChange}
                placeholder="e.g., 50"
                min="0"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="attendedClasses">Classes Attended</label>
              <input
                type="number"
                id="attendedClasses"
                name="attendedClasses"
                value={newSubject.attendedClasses}
                onChange={handleInputChange}
                placeholder="e.g., 45"
                min="0"
                required
              />
            </div>
            <button type="submit" className="btn">
              Add Subject
            </button>
          </form>
        </div>

        <div className="subjects-list">
          <h2>Your Subjects</h2>
          {subjects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-text">
                No subjects added yet. Add your first subject above!
              </div>
            </div>
          ) : (
            subjects.map(subject => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                onUpdate={handleUpdateAttendance}
                onDelete={handleDeleteSubject}
                getPercentageClass={getPercentageClass}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function SubjectCard({ subject, onUpdate, onDelete, getPercentageClass }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValues, setEditValues] = useState({
    total: subject.totalClasses,
    attended: subject.attendedClasses
  })

  const handleEdit = () => {
    setIsEditing(true)
    setEditValues({
      total: subject.totalClasses,
      attended: subject.attendedClasses
    })
  }

  const handleSave = () => {
    onUpdate(subject.id, editValues.attended, editValues.total)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValues({
      total: subject.totalClasses,
      attended: subject.attendedClasses
    })
  }

  return (
    <div className="subject-card">
      <div className="subject-header">
        <div className="subject-name">{subject.name}</div>
        <button
          className="delete-btn"
          onClick={() => onDelete(subject.id)}
        >
          Delete
        </button>
      </div>

      <div className="percentage-bar">
        <div
          className={`percentage-fill ${getPercentageClass(subject.percentage)}`}
          style={{ width: `${subject.percentage}%` }}
        />
        <div className="percentage-text">{subject.percentage}%</div>
      </div>

      {!isEditing ? (
        <>
          <div className="attendance-info">
            <div className="info-item">
              <div className="info-label">Total Classes</div>
              <div className="info-value">{subject.totalClasses}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Attended</div>
              <div className="info-value">{subject.attendedClasses}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Missed</div>
              <div className="info-value">
                {subject.totalClasses - subject.attendedClasses}
              </div>
            </div>
          </div>
          <button className="btn btn-small" onClick={handleEdit}>
            Update Attendance
          </button>
        </>
      ) : (
        <div className="update-form">
          <div className="form-group">
            <label>Total Classes</label>
            <input
              type="number"
              value={editValues.total}
              onChange={(e) =>
                setEditValues(prev => ({ ...prev, total: e.target.value }))
              }
              min="0"
            />
          </div>
          <div className="form-group">
            <label>Attended</label>
            <input
              type="number"
              value={editValues.attended}
              onChange={(e) =>
                setEditValues(prev => ({ ...prev, attended: e.target.value }))
              }
              min="0"
            />
          </div>
          <button className="btn btn-small" onClick={handleSave}>
            Save
          </button>
          <button
            className="btn btn-small"
            onClick={handleCancel}
            style={{ background: '#95a5a6' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

export default App
