import React from "react";

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
        zIndex: 500, // Ajustez le z-index pour qu'il soit plus élevé que les éléments
      }}
    >
      <defs>
        {svgConnections.map((conn) => (
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

      {svgConnections.map((conn) => (
        <path
          key={`path-${conn.id}`}
          d={conn.path}
          stroke={conn.color}
          strokeWidth={conn.thickness}
          fill="none"
          markerEnd={`url(#arrowhead-${conn.id})`}
          style={{ pointerEvents: "none" }} // Assurez-vous que les lignes n'interfèrent pas avec les clics
        />
      ))}
    </svg>
  );
};

export default SVGConnector;
