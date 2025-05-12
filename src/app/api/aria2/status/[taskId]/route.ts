// src/app/api/aria2/status/[taskId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// In-memory store for simulated task progress (for dev only, resets on server restart)
const taskSimulations: Record<string, { startTime: number; totalLength: number; name: string; type?: string }> = {};

function getDeterministicRandom(seed: string, max: number, min = 0) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const random = Math.abs(hash);
  return min + (random % (max - min + 1));
}


export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const taskId = params.taskId;

    if (!taskId) {
      console.warn('[API Aria2 Status] Task ID is required in request.');
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // console.log(`[API Aria2 Status] Received status request for Task ID: ${taskId}`);

    if (!taskSimulations[taskId]) {
      // If task not in simulation, maybe it was just added or from old localStorage.
      // Initialize a basic simulation for it.
      const conceptualTasksString = request.cookies.get('chillymovies-conceptual-tasks-for-sim')?.value; // Not ideal, but for demo
      let conceptualTaskName = `Task ${taskId.substring(0,8)}`;
      let conceptualTaskType = 'magnet';
      if (conceptualTasksString) {
          try {
            const conceptualTasks = JSON.parse(conceptualTasksString);
            const foundTask = conceptualTasks.find((t: any) => t.taskId === taskId);
            if (foundTask) {
                conceptualTaskName = foundTask.name;
                conceptualTaskType = foundTask.type;
            }
          } catch (e) { /* ignore parsing error */ }
      }
      
      taskSimulations[taskId] = { 
        startTime: Date.now() - getDeterministicRandom(taskId, 60000, 5000), // Simulate it started some time ago
        totalLength: getDeterministicRandom(taskId, 2 * 1e9, 0.5 * 1e8), // 0.5GB to 2GB
        name: conceptualTaskName,
        type: conceptualTaskType,
      };
      console.log(`[API Aria2 Status] Initialized new simulation for unknown task ID: ${taskId}`);
    }

    const simulation = taskSimulations[taskId];
    const elapsedTimeMs = Date.now() - simulation.startTime;
    const totalSimulatedDurationMs = getDeterministicRandom(taskId, 120000, 30000); // 30s to 2min to complete

    let progressRatio = elapsedTimeMs / totalSimulatedDurationMs;
    let status = 'active';
    let errorCode = '0';
    let errorMessage = '';

    if (progressRatio >= 1) {
      progressRatio = 1;
      status = 'complete';
    } else if (progressRatio < 0) { // Should not happen with startTime logic
        progressRatio = 0;
        status = 'waiting';
    }

    // Simulate occasional errors or pauses for variety based on taskId
    const taskNumericalId = parseInt(taskId.replace(/-/g, '').substring(0, 5), 16) || 0;
    if (taskNumericalId % 15 === 0 && progressRatio > 0.3 && progressRatio < 0.7) {
        status = 'error';
        errorCode = getDeterministicRandom(taskId.substring(0,3), 10, 1).toString();
        errorMessage = `Simulated download error type ${errorCode}`;
        progressRatio = Math.min(progressRatio, 0.7); // Cap progress on error
    } else if (taskNumericalId % 10 === 0 && progressRatio > 0.2 && progressRatio < 0.8 && status !== 'error') {
        status = 'paused';
    }


    const completedLength = Math.floor(simulation.totalLength * progressRatio);
    const downloadSpeed = status === 'active' ? getDeterministicRandom(taskId, 1.5 * 1e6, 0.5 * 1e5) : 0; // 0.5MB/s to 1.5MB/s

    const simulatedStatus: any = {
      gid: taskId,
      status: status,
      totalLength: simulation.totalLength.toString(),
      completedLength: completedLength.toString(),
      downloadSpeed: downloadSpeed.toString(),
      uploadSpeed: (status === 'active' || status === 'complete' ? getDeterministicRandom(taskId, 1e5, 1e4) : 0).toString(),
      connections: (status === 'active' ? getDeterministicRandom(taskId, 50, 5) : 0).toString(),
      numSeeders: (status === 'active' ? getDeterministicRandom(taskId, 20, 1) : 0).toString(),
      errorCode: errorCode,
      errorMessage: errorMessage,
      bitTorrent: { // Simulate this part for magnet-like downloads
        info: {
          name: simulation.type === 'magnet' || simulation.type === 'tv_episode' || simulation.type === 'tv_season_pack' || simulation.type === 'tv_season_pack_all' ? simulation.name : `File_${taskId.substring(0,6)}`
        }
      }
    };
    
    if (status === 'complete') {
        simulatedStatus.downloadUrl = `/api/aria2/file/${taskId}/${encodeURIComponent(simulatedStatus.bitTorrent.info.name)}.txt`; // Placeholder served by file API
    }

    // console.log(`[API Aria2 Status] Conceptual status for ${taskId}: Progress ${Math.round(progressRatio*100)}%, Status ${status}`);
    return NextResponse.json(simulatedStatus, { status: 200 });

  } catch (error) {
    console.error('[API Aria2 Status] Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json({ error: 'Failed to process Aria2 status request', details: errorMessage }, { status: 500 });
  }
}
