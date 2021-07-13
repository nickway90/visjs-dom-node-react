import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faStop, faSave, faWrench, faSitemap, faProjectDiagram } from '@fortawesome/free-solid-svg-icons'
import Legend from '../Legend'
import './style.scss'

export default ({ groups, hiddenGroups, extendLegend, onToggleGroup, onFitWindow, onSaveClick, onSearch, onToggleView }) => {
  const [showLegend, setShowLegend] = useState(false)
  const [view, setView] = useState(true)
  const legendRef = useRef();

  useEffect(() => {
    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
    }
  }, [])

  const handleClick = e => {
    if (legendRef.current && !legendRef.current.contains(e.target)) {
      setShowLegend(false);
    }
  }

  const handleSearchChange = e => {
    const q = e.target.value
    if (e.which === 13 || q.length === 0) {
      onSearch && onSearch(q)
    }
  }

  const handleLegendHover = () => setShowLegend(true)

  const handleToggleView = () => {
    setView(!view)
    onToggleView && onToggleView(!view)
  }

  return (
    <div className='Toolbar'>
      <input
        className='Toolbar__SearchNetwork'
        placeholder='Search this network'
        onKeyUp={handleSearchChange}
      />
      <div>
        <span
          title='Graph/Tree view'
          className='Toolbar__Tool'
          onClick={handleToggleView}
        >
          <FontAwesomeIcon icon={view ? faProjectDiagram : faSitemap} />
        </span>
        <span
          title='Fit to window'
          onClick={onFitWindow}
          className='Toolbar__Tool'
        >
          <FontAwesomeIcon icon={faStop} />
        </span>
        <span
          title='Save network'
          onClick={onSaveClick}
          className='Toolbar__Tool'
        >
          <FontAwesomeIcon icon={faSave} />
        </span>
        <span onMouseEnter={handleLegendHover} className='Toolbar__Tool'>
          <FontAwesomeIcon icon={faWrench} />
        </span>
      </div>

      {showLegend && (
        <Legend
          className='Toolbar__Legend'
          extend={extendLegend}
          onToggleGroup={onToggleGroup}
          hiddenGroups={hiddenGroups}
          groups={groups}
          ref={legendRef}
        />
      )}
    </div>
  )
}
