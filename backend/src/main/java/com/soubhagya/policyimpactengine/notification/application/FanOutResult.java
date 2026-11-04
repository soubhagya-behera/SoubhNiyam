package com.soubhagya.policyimpactengine.notification.application;

import java.util.UUID;

public sealed interface FanOutResult permits
		FanOutResult.Processed,
		FanOutResult.NoActionable,
		FanOutResult.Cancelled,
		FanOutResult.RetryableFailure,
		FanOutResult.PermanentFailure {

	record Processed(UUID assessmentId, int recommendationCount, boolean notificationCreated)
			implements FanOutResult {
	}

	record NoActionable(UUID assessmentId, int recommendationCount) implements FanOutResult {
	}

	record Cancelled(String reason) implements FanOutResult {
	}

	record RetryableFailure(String error) implements FanOutResult {
	}

	record PermanentFailure(String error) implements FanOutResult {
	}
}