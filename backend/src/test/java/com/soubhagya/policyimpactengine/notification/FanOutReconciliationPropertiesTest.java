package com.soubhagya.policyimpactengine.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.ConfigurationPropertySources;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mock.env.MockPropertySource;

class FanOutReconciliationPropertiesTest {

	@TestConfiguration
	@EnableConfigurationProperties(FanOutReconciliationProperties.class)
	static class DefaultsConfig {
	}

	private static FanOutReconciliationProperties bind(String... pairs) {
		MockPropertySource source = new MockPropertySource();
		for (int i = 0; i < pairs.length; i += 2) {
			source.setProperty(pairs[i], pairs[i + 1]);
		}
		Binder binder = new Binder(ConfigurationPropertySources.from(source));
		return binder.bind("fan-out.reconciliation", FanOutReconciliationProperties.class)
				.orElseThrow(() -> new IllegalStateException("Binding must produce properties"));
	}

	private static FanOutReconciliationProperties defaults() {
		AtomicReference<FanOutReconciliationProperties> bound = new AtomicReference<>();
		new ApplicationContextRunner()
				.withUserConfiguration(DefaultsConfig.class)
				.run(context -> bound.set(
						context.getBean(FanOutReconciliationProperties.class)));
		return bound.get();
	}

	@Test
	void defaultsKeepReconciliationDisabled() {
		FanOutReconciliationProperties properties = defaults();

		assertThat(properties.enabled()).isFalse();
		assertThat(properties.interval()).isEqualTo(Duration.ofMinutes(5));
		assertThat(properties.batchSize()).isEqualTo(50);
	}

	@Test
	void customValuesBindCorrectly() {
		FanOutReconciliationProperties properties = bind(
				"fan-out.reconciliation.enabled", "true",
				"fan-out.reconciliation.interval", "PT10M",
				"fan-out.reconciliation.batch-size", "25");

		assertThat(properties.enabled()).isTrue();
		assertThat(properties.interval()).isEqualTo(Duration.ofMinutes(10));
		assertThat(properties.batchSize()).isEqualTo(25);
	}

	@Test
	void zeroOrNegativeIntervalIsRejected() {
		assertThatThrownBy(() -> new FanOutReconciliationProperties(false,
				Duration.ZERO, 50))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("fan-out.reconciliation.interval must be positive");
		assertThatThrownBy(() -> new FanOutReconciliationProperties(false,
				Duration.ofSeconds(-1), 50))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("fan-out.reconciliation.interval must be positive");
	}

	@Test
	void batchSizeBelowOneIsRejected() {
		assertThatThrownBy(() -> new FanOutReconciliationProperties(false,
				Duration.ofMinutes(5), 0))
				.isInstanceOf(IllegalArgumentException.class)
				.hasMessageContaining("fan-out.reconciliation.batch-size must be >= 1");
	}
}
