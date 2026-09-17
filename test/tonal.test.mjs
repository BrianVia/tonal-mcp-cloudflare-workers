import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  detailActivity,
  filterMovements,
  summarizeActivities,
  summarizeActivityList,
  summarizeFormattedWorkout,
} from "../src/tonal.ts";

describe("summarizeActivities", () => {
  test("maps summary fields", () => {
    const [row] = summarizeActivities([{
      id: "a1", name: "Push", timestamp: "2026-09-01T12:00:00Z",
      duration: 3600, timeUnderTension: 1200, totalVolume: 10000,
      totalReps: 120, targetArea: "UPPER BODY", isGuidedWorkout: true, isInProgram: false,
    }]);
    assert.equal(row.id, "a1");
    assert.equal(row.totalVolumeLbs, 10000);
    assert.equal(row.guided, true);
    assert.equal(row.inProgram, false);
  });
});

describe("summarizeActivityList", () => {
  test("maps list rows", () => {
    const [row] = summarizeActivityList([{
      id: "w1", beginTime: "2026-09-01T12:00:00Z", totalSets: 12, totalReps: 80, totalVolume: 9000,
    }]);
    assert.equal(row.beginTime, "2026-09-01T12:00:00Z");
    assert.equal(row.totalVolumeLbs, 9000);
  });
});

describe("detailActivity", () => {
  test("resolves movement names and set weights", () => {
    const names = new Map([["m1", "Bench Press"]]);
    const detail = detailActivity({
      id: "w1", beginTime: "2026-09-01T12:00:00Z", endTime: "2026-09-01T13:00:00Z",
      totalDuration: 3600, activeDuration: 1800, totalSets: 1, totalReps: 8, totalVolume: 800,
      workoutSetActivity: [{
        movementId: "m1", setGroup: 1, blockNumber: 1, repCount: 8,
        avgWeight: 100, oneRepMax: 130, totalOnMachineVolume: 800, romLengthIn: 18,
      }],
    }, names);
    assert.equal(detail.sets[0].movementName, "Bench Press");
    assert.equal(detail.sets[0].avgWeightLbs, 100);
    assert.equal(detail.sets[0].oneRepMaxLbs, 130);
  });
});

describe("summarizeFormattedWorkout", () => {
  test("compacts movement sets", () => {
    const summary = summarizeFormattedWorkout({
      name: "Full Body", coachName: "Coach", targetArea: "FULL BODY",
      isInProgram: true, isGuidedWorkout: true, duration: 2400, timeUnderTension: 900,
      movementSets: [{
        movementName: "Squat", blockNumber: 1, setGroup: 1,
        totalVolume: 2000, totalOnMachineVolume: 2000, sets: [{}, {}],
      }],
    });
    assert.equal(summary.movements[0].setCount, 2);
    assert.equal(summary.movements[0].totalVolumeLbs, 2000);
  });
});

describe("filterMovements", () => {
  test("matches name and muscle group", () => {
    const catalog = [
      { id: "1", name: "Bench Press", muscleGroups: ["Chest"], bodyRegion: "Upper Body" },
      { id: "2", name: "Deadlift", muscleGroups: ["Back"], bodyRegion: "Posterior" },
    ];
    assert.equal(filterMovements(catalog, "bench").length, 1);
    assert.equal(filterMovements(catalog, "back")[0].id, "2");
  });
});
