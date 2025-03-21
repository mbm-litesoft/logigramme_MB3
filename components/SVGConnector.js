import React from 'react';

const SVGConnector = ({ svgConnections }) => {
  return (
    <svg 
      className="connections-container" 
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 9000
      }}
    >
      <defs>
        {svgConnections.map(conn => (
          <marker 
            key={`marker-${conn.id}`}
            id={`arrowhead-${conn.id}`}
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={conn.color} />
          </marker>
        ))}
      </defs>
      
      {svgConnections.map(conn => (
        <path
          key={`path-${conn.id}`}
          d={conn.path}
          stroke={conn.color}
          strokeWidth={conn.thickness}
          fill="none"
          markerEnd={`url(#arrowhead-${conn.id})`}
        />
      ))}
      
      {/* Cercle de test pour vérifier que le SVG fonctionne */}
      <circle cx="50" cy="50" r="25" fill="red" />
    </svg>
  );
};

export default SVGConnector;