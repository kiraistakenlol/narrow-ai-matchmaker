```pseudo

for scenario in SCENARIOS:
    // 1. Prepare dataset
    dataset = BASE_SET + scenario.bundle

    // 2. Embed all profiles
    embeddings = embed_profiles(dataset)

    // 3. Query and evaluate
    for profile in scenario.bundle:
        results = query_top_k(embeddings, profile, K)
        expected = scenario.expected_matches[profile.id]
        assert all(id in results.ids for id in expected)

    // 4. Compute metrics
    precision = compute_precision(results, expected)
    recall = compute_recall(results, expected)
    mrr = compute_mrr(results, expected)

    log_metrics(scenario.id, precision, recall, mrr)
```

