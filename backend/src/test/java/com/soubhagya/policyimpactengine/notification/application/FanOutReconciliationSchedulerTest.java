package com.soubhagya.policyimpactengine.notification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class FanOutReconciliationSchedulerTest {

	private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
			.withBean(FanOutReconciliationService.class,
					() -> mock(FanOutReconciliationService.class))
			.withUserConfiguration(FanOutReconciliationScheduler.class);

	@Test
	void schedulerIsAbsentByDefault() {
		contextRunner.run(context -> assertThat(context)
				.doesNotHaveBean(FanOutReconciliationScheduler.class));
	}

	@Test
	void schedulerIsPresentOnlyWhenFeatureFlagIsTrue() {
		contextRunner
				.withPropertyValues("fan-out.reconciliation.enabled=true")
				.run(context -> assertThat(context)
						.hasSingleBean(FanOutReconciliationScheduler.class));

		contextRunner
				.withPropertyValues("fan-out.reconciliation.enabled=false")
				.run(context -> assertThat(context)
						.doesNotHaveBean(FanOutReconciliationScheduler.class));
	}

	@Test
	void scheduledRunDelegatesToReconciliationService() {
		FanOutReconciliationService service = mock(FanOutReconciliationService.class);
		FanOutReconciliationScheduler scheduler = new FanOutReconciliationScheduler(service);

		scheduler.reconcile();

		verify(service).reconcile();
	}

	@Test
	void nullServiceIsRejected() {
		assertThatThrownBy(() -> new FanOutReconciliationScheduler(null))
				.isInstanceOf(IllegalArgumentException.class);
	}
}
