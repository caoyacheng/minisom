import {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { PipelineStepNode } from "./pipeline/PipelineStepNode";
import { buildPipelineFlow } from "./pipeline/buildPipelineFlow";
import {
  loadPipelinePositions,
  resetPipelinePositions,
  savePipelinePositions,
} from "./pipeline/pipelineLayoutStorage";
import type { PipelineNodeData, PipelineStepStatus } from "./pipeline/types";

const nodeTypes = { pipelineStep: PipelineStepNode };

interface Props {
  steps: PipelineStepStatus[];
  onResetLayout?: () => void;
}

function PipelineFlowInner({ steps, onResetLayout }: Props) {
  const { getNodes, fitView } = useReactFlow();
  const positionsRef = useRef(loadPipelinePositions());

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => buildPipelineFlow(steps, positionsRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial mount only
    [],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const step = steps.find((s) => s.id === node.id);
        if (!step) return node;
        return {
          ...node,
          data: {
            ...(node.data as PipelineNodeData),
            state: step.state,
            detail: step.detail,
            label: step.label,
          },
          draggable: true,
        };
      }),
    );
    setEdges((eds) => {
      const { edges: nextEdges } = buildPipelineFlow(
        steps,
        positionsRef.current,
      );
      return nextEdges.map((ne) => {
        const existing = eds.find((e) => e.id === ne.id);
        return existing ? { ...existing, ...ne } : ne;
      });
    });
  }, [steps, setNodes, setEdges]);

  const onNodeDragStop = useCallback(() => {
    const snapshot = getNodes();
    savePipelinePositions(snapshot);
    positionsRef.current = Object.fromEntries(
      snapshot.map((n) => [n.id, n.position]),
    );
  }, [getNodes]);

  const fitCanvas = useCallback(() => {
    requestAnimationFrame(() => {
      fitView({ padding: 0.18, duration: 280, maxZoom: 1 });
    });
  }, [fitView]);

  useEffect(() => {
    fitCanvas();
  }, [fitCanvas]);

  const resetLayout = useCallback(() => {
    const positions = resetPipelinePositions();
    positionsRef.current = positions;
    const { nodes: freshNodes, edges: freshEdges } = buildPipelineFlow(
      steps,
      positions,
    );
    setNodes(freshNodes);
    setEdges(freshEdges);
    onResetLayout?.();
    fitCanvas();
  }, [steps, setNodes, setEdges, onResetLayout, fitCanvas]);

  return (
    <div className="pipeline-flow-wrap pipeline-flow-wrap--fullscreen pipeline-flow-wrap--workflow">
      <ReactFlow
        className="pipeline-react-flow"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        panOnDrag={[1, 2]}
        panOnScroll
        zoomOnScroll
        zoomOnPinch
        selectionOnDrag={false}
        minZoom={0.35}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.25}
          className="pipeline-flow-bg"
        />
        <Controls
          showInteractive={false}
          position="bottom-right"
          className="pipeline-flow-controls"
        />
        <Panel position="top-left" className="pipeline-flow-panel nodrag nopan">
          <div className="pipeline-flow-toolbar">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={fitCanvas}
            >
              适应画布
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={resetLayout}
            >
              重置布局
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function PipelineFlow(props: Props) {
  return (
    <ReactFlowProvider>
      <PipelineFlowInner {...props} />
    </ReactFlowProvider>
  );
}
