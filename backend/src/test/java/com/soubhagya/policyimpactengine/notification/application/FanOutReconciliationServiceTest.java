package com.soubhagya.policyimpactengine.notification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import com.soubhagya.policyimpactengine.notification.domain.FanOutTaskRepository;

@ExtendWith(MockitoExtension.class)
class FanOutReconciliationServiceTest {

	private static final Instant NOW = Instant.parse("2026-09-18T10:00:00Z");
	private static final int BATCH_SIZE = 50;

	@Mock
	private FanOutTaskRepository taskRepository;

	@Mock
	private FanOutTaskService taskService;

	private FanOutReconciliationService service;

	@BeforeEach
	void setUp() {
		service = new FanOutReconciliationService(taskRepository, taskService,
				Clock.fixed(NOW, ZoneOffset.UTC), BATCH_SIZE);
	}

	@Test
	void recoversExpiredLeasesBeforeSelectingAndProcessingDueTasks() {
		UUID first = UUID.randomUUID();
		UUID second = UUID.randomUUID();
		when(taskRepository.findDuePendingTaskIds(eq(NOW), any(Pageable.class)))
				.thenReturn(List.of(first, second));
		when(taskService.processTask(first))
				.thenReturn(new FanOutResult.NoActionable(UUID.randomUUID(), 1));
		when(taskService.processTask(second))
				.thenReturn(new FanOutResult.Processed(UUID.randomUUID(), 1, true));

		int processed = service.reconcile();

		InOrder order = inOrder(taskService);
		order.verify(taskService).recoverExpiredLeases();
		order.verify(taskService).processTask(first);
		order.verify(taskService).processTask(second);
		assertThat(processed).isEqualTo(2);
	}

	@Test
	void dueSelectionUsesConfiguredBatchAndCurrentTime() {
		when(taskRepository.findDuePendingTaskIds(eq(NOW), any(Pageable.class)))
				.thenReturn(List.of());

		service.reconcile();

		verify(taskRepository).findDuePendingTaskIds(NOW, PageRequest.of(0, BATCH_SIZE));
	}

	@Test
	void lostClaimDoesNotCountAsProcessedOrAbortLaterTasks() {
		UUID lost = UUID.randomUUID();
		UUID won = UUID.randomUUID();
		when(taskRepository.findDuePendingTaskIds(eq(NOW), any(Pageable.class)))
				.thenReturn(List.of(lost, won));
		when(taskService.processTask(lost)).thenReturn(null);
		when(taskService.processTask(won))
				.thenReturn(new FanOutResult.Processed(UUID.randomUUID(), 1, true));

		int processed = service.reconcile();

		assertThat(processed).isEqualTo(1);
		verify(taskService).processTask(won);
	}

	@Test
	void oneTaskFailureDoesNotAbortTheRemainingBatch() {
		UUID failing = UUID.randomUUID();
		UUID healthy = UUID.randomUUID();
		when(taskRepository.findDuePendingTaskIds(eq(NOW), any(Pageable.class)))
				.thenReturn(List.of(failing, healthy));
		when(taskService.processTask(failing))
				.thenThrow(new IllegalStateException("poison task"));
		when(taskService.processTask(healthy))
				.thenReturn(new FanOutResult.NoActionable(UUID.randomUUID(), 1));

		int processed = service.reconcile();

		assertThat(processed).isEqualTo(1);
		verify(taskService).processTask(healthy);
	}

	@Test
	void emptyDueListDoesNoFanOutWork() {
		when(taskRepository.findDuePendingTaskIds(eq(NOW), any(Pageable.class)))
				.thenReturn(List.of());

		int processed = service.reconcile();

		assertThat(processed).isZero();
		verify(taskService).recoverExpiredLeases();
		verify(taskService, never()).processTask(any());
	}

	@Test
	void nullTimeIsRejectedBeforeAnyWork() {
		assertThatThrownBy(() -> service.reconcile(null))
				.isInstanceOf(IllegalArgumentException.class);
		verifyNoInteractions(taskService);
		verifyNoInteractions(taskRepository);
	}

	@Test
	void constructorRejectsMissingDependenciesAndNonPositiveBatchSize() {
		Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
		assertThatThrownBy(() -> new FanOutReconciliationService(null, taskService,
				clock, BATCH_SIZE))
				.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> new FanOutReconciliationService(taskRepository, null,
				clock, BATCH_SIZE))
				.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> new FanOutReconciliationService(taskRepository, taskService,
				null, BATCH_SIZE))
				.isInstanceOf(IllegalArgumentException.class);
		assertThatThrownBy(() -> new FanOutReconciliationService(taskRepository, taskService,
				clock, 0))
				.isInstanceOf(IllegalArgumentException.class);
	}
}
