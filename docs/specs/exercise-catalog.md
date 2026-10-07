## Problem Statement

The current Callus app has no exercise catalog, equipment taxonomy, exercise-domain schema, catalog importer, or catalog screens. The previous app contains a substantial exercise dataset and related code, but copying it wholesale would bring back unwanted PowerSync dependencies, native snapshot installation, personal editing behavior, and an architecture that does not fit the current monorepo.

The user wants the exercise foundation installed properly now, with a usable read-only catalog on web and native. The port must critically evaluate the old model and preserve useful data without preserving its mistakes. In particular, old body-part labels mix regions, muscle groups, and activities, while equipment labels mix physical implements and exercise modifiers.

Content rights are uncertain. Public access to a bucket does not establish permission to redistribute its content. The feature must be implementable and testable locally without accidentally publishing unverified data or illustrations.

## Solution

Provide a shared, server-backed exercise catalog that visitors can browse without signing in on both web and native. Import all valid exercises from the previous catalog, preserve their stable exercise IDs, and expose consistent name search, taxonomy filters, paginated results, and exercise details.

Separate body regions, muscles, and activity categories. Treat equipment as descriptive catalog classification, not a complete list of required gear. Preserve source labels and mappings, normalize only established equivalences, and report ambiguous classifications instead of guessing.

Install and update catalog data through a deliberate, validated, transactional command separate from migrations and demo-account seeding. Repeated imports must be safe. Removed exercises become retired rather than disappearing from history or remaining in ordinary results forever.

Support configurable exercise media and useful muscle diagrams, with honest missing-content states. Reuse the old bucket only for content whose rights and intended use have been established. Keep unverified catalog content and visual assets out of public delivery until their respective publication gates are cleared.

## User Stories

1. As a visitor, I want to open the web catalog without signing in, so that I can explore exercises before creating an account.
2. As a native app visitor, I want to open the catalog without completing authentication or onboarding, so that reference browsing is available independently of personal features.
3. As a signed-in user, I want to use the same shared catalog as visitors, so that signing in does not change reference-data search behavior.
4. As a visitor, I want to browse every valid exercise in the imported catalog, so that launch does not arbitrarily restrict the collection to a small subset.
5. As a visitor, I want case-insensitive exercise-name search, so that capitalization does not prevent me finding an exercise.
6. As a visitor, I want search punctuation treated literally, so that entering SQL wildcard characters does not unexpectedly broaden results.
7. As a visitor, I want to filter by equipment labels, so that I can browse exercises associated with an implement or exercise mode.
8. As a visitor, I want equipment filters described honestly, so that I do not mistake incomplete source tags for verified exercise requirements.
9. As a visitor, I want to filter by body region, so that region filters do not also contain activities such as Yoga.
10. As a visitor, I want to filter by muscle, so that I can explore anatomical targets separately from broad regions.
11. As a visitor, I want to distinguish primary targets from all listed muscles, so that I can choose whether secondary muscle involvement should match.
12. As a visitor, I want to filter by activity category, so that activities such as Stretching are not mislabeled as anatomy.
13. As a visitor, I want multiple selected values within a filter group to match any selected value, so that I can broaden that group deliberately.
14. As a visitor, I want different filter groups and name search to combine, so that I can narrow the catalog predictably.
15. As a visitor, I want to clear search and filters, so that I can return to the full catalog easily.
16. As a visitor, I want alphabetically ordered, paginated results, so that thousands of exercises remain practical to browse.
17. As a visitor, I want exercises with identical names to remain distinct and show identifying context, so that I can choose the intended variation.
18. As a visitor, I want to open exercise details through a stable exercise identifier, so that links do not depend on a non-unique name.
19. As a visitor, I want details to show the available equipment, region, muscle, activity, and measurement information, so that I understand what the catalog actually records.
20. As a visitor, I want missing instructions represented honestly, so that the app does not present invented coaching advice as source content.
21. As a visitor, I want available images and videos to display when permitted, so that I can recognize an exercise visually.
22. As a visitor, I want missing or failed media to leave the remaining details usable, so that an unavailable bucket object does not break the screen.
23. As a visitor, I want permitted muscle diagrams to distinguish primary and secondary targets, so that the visualization reflects recorded muscle relationships.
24. As a visitor, I want unsupported muscle illustrations handled without false anatomical claims, so that a missing or approximate asset is not presented as an exact depiction.
25. As a visitor, I want clear loading, empty, error, and retry states, so that I can distinguish no results from a network failure.
26. As a visitor, I want equivalent search and filter behavior on web and native, so that changing clients does not change the meaning of a query.
27. As a visitor, I want a retired exercise link to explain that it is no longer in the active catalog, so that an old link does not silently lead to an unrelated exercise.
28. As a maintainer, I want stable exercise IDs preserved during the port and updates, so that catalog identity survives schema changes.
29. As a maintainer, I want source labels and explicit canonical mappings retained, so that normalization decisions can be audited and corrected.
30. As a maintainer, I want ambiguous classifications reported without discarding valid exercises, so that imperfect source taxonomy does not prevent importing the full collection.
31. As an operator, I want an explicit catalog installation and update command, so that catalog writes happen deliberately rather than during every server startup.
32. As an operator, I want catalog installation separate from migrations and demo seeding, so that importing reference data does not create accounts, sample personal data, or API credentials.
33. As an operator, I want malformed rows, duplicate identifiers, duplicate relationships, and dangling references rejected before persistence, so that a broken release cannot partially corrupt the catalog.
34. As an operator, I want a failed import to leave the previous catalog unchanged, so that readers retain a consistent dataset.
35. As an operator, I want rerunning the same import to preserve identities and avoid duplicate rows, so that installation is safe to repeat.
36. As an operator, I want updates to reconcile source-owned relationships, so that removed tags and muscle associations do not remain stale.
37. As an operator, I want missing exercises retired and returning exercises reactivated, so that active browsing follows the current catalog release without losing identity.
38. As an operator, I want an import summary including meaningful changes and unresolved mappings, so that I can review the outcome without reading database internals.
39. As an operator, I want the exercise-media base URL configurable, so that bucket hosting is not hardcoded into application logic.
40. As a maintainer, I want content provenance and publication permission tracked separately for catalog data, exercise media, and muscle illustrations, so that permission for one does not imply permission for all.
41. As a maintainer, I want uncertain content unavailable through public responses and asset delivery until approved, so that local development does not accidentally become redistribution.
42. As a contributor, I want shared contracts and focused behavior tests to follow the current repo's conventions, so that the exercise domain is maintainable without recreating the previous architecture.

## Implementation Decisions

- This is a fresh catalog installation, not a migration of old users, personal exercises, favorites, routines, or workouts. Preserve committed exercise UUIDs as durable public identifiers. Do not deduplicate by name; the audit found 1,142 repeated exercise names.
- The inspected source contains 7,542 exercises, 28 equipment labels, 44 muscle labels, 20 mixed body-part labels, and 51,705 relationship rows. These counts describe the audited source, not permanent hardcoded schema limits.
- Port the data model and useful behavior selectively. Do not recreate old packages or helper layers merely for one-to-one correspondence. Keep straightforward domain modules within the current monorepo.
- The shared exercise domain belongs in the existing core package. It owns transport-safe validation schemas, filter contracts, reusable classification values, and pure domain helpers. It must not depend on React, database access, environment loading, or network clients.
- Persistence belongs in the existing database package. Model exercises, descriptive equipment classifications, muscles, body regions, activity categories, and their relationships with normalized tables. Preserve primary versus secondary muscle involvement. Use foreign keys and relationship uniqueness constraints. Relationship-row UUIDs are not required as a public contract.
- Follow the current database convention of typed text with runtime boundary validation and storage checks where needed, rather than copying old native database enums. Do not modify generated authentication schema for this feature.
- Retain the existing measurement distinctions of weight and repetitions, duration, and distance with duration. These describe measurement behavior, not activity taxonomy. This phase displays them but does not add workout recording.
- Separate canonical classification from original source labels. Use explicit, reviewable source-to-canonical mappings. Broad regions may be derived only through an agreed, recorded muscle-to-region mapping. Broad muscle-group labels must not be converted into invented exact anatomical relationships.
- Preserve ambiguous labels as traceable source information and report unmapped classifications. Missing canonical classification does not exclude an otherwise valid exercise. Do not automatically merge overlapping equipment labels or infer classifications from exercise names.
- Equipment classification is descriptive only. Source labels such as Body weight, Weighted, and Assisted must not masquerade as verified physical gear requirements. Do not add gym inventories, required-versus-optional gear logic, or exercise-feasibility claims.
- The public catalog module belongs in the existing API package and uses its existing public-procedure infrastructure. Its interface provides active exercise listing, taxonomy/filter options, and detail lookup by stable exercise ID. Reads are available without a session when the publication gate permits the content.
- Both clients consume one shared server contract. Name search is case-insensitive substring matching against exercise names only. Trim surrounding input whitespace; blank search means no name restriction. Escape SQL wildcard characters so user input remains literal.
- Equipment, region, muscle, and activity filters are separate groups. Multiple values within a group use OR; selected groups and name search use AND. Muscle matching supports primary-only and all-listed-muscles modes. Validate the mode in the shared contract.
- Order results alphabetically by exercise name with stable exercise ID as the tie-breaker. Pagination must be bounded and use the same ordering on both clients. Changing search or filters resets pagination. The exact pagination mechanism may follow the simplest existing convention; it must not produce duplicate exercises through relationship joins.
- Exercise summaries include enough classification context to distinguish same-named rows. Details expose available source facts, stable identity, canonical classifications, and retirement status without fabricated content.
- Normal listings exclude retired exercises. A retained retired identity produces an explicit retired/unavailable detail state rather than silently becoming a different exercise. Unknown IDs produce the API's typed not-found behavior.
- The importer is a deliberate database-package operation with an explicit workspace command. Validate the full input and relationship integrity before writes, then apply updates atomically. No catalog import during server startup and no automatic deployment integration in this phase.
- Keep schema migrations and catalog content installation separate. The catalog command assumes the required schema has been applied and must fail clearly when it has not. It must not seed administrators, issue API keys, or insert sample personal exercises.
- Rerunning identical source data must not duplicate or mutate identity. Reconcile source-owned relationships authoritatively, retire missing exercises, and reactivate restored ones. Never delete unrelated or future user-owned data. Report inserted, changed, retired, reactivated, and unresolved-mapping outcomes as applicable.
- Exercise media uses retained source keys and a configurable public base URL. The intended host is the old bucket, conditional on established rights. Missing media, failed requests, and missing size variants must degrade gracefully. Do not make remote media fetches part of catalog import or required application startup.
- Port only useful muscle-asset mapping and rendering behavior. Keep a single asset source where practical and use platform-appropriate loading, including static native asset references. Do not introduce a separate muscles package unless actual asset/build constraints justify it.
- Preserve distinctions between exact muscle assets, reused approximate layers, and absent illustrations. Do not invent illustrations or imply that a neighboring muscle's drawing is exact anatomy. Verify actual target-runtime compatibility rather than copying old Hermes limitations as timeless assumptions.
- All inspected exercise instructions are empty. Keep them absent, with appropriate UI treatment. Do not generate exercise instructions, translations of catalog facts, or coaching claims to fill gaps. Application-owned UI copy follows the repo's existing localization conventions.
- Web and native each own their screens within the current routing and feature structure. Public navigation must sit outside authentication/onboarding guards. Share contracts and pure logic, not platform-specific UI by default. Respect current UI and data-flow guidance and provide loading, no-results, error/retry, and missing-media states.
- Use existing server/query fetching patterns and ordinary query caching. No native SQLite catalog, snapshot builder, manifest downloader, installation lifecycle, or offline guarantee.
- Content publication is gated independently for catalog data, exercise media, and muscle illustrations. Record provenance and permission evidence before enabling each content class. Unverified material must not be exposed by public procedures or packaged into publicly delivered static assets/native releases. Testing and local implementation use sanitized or original fixtures where rights are not established. This gate is distinct from requiring users to sign in.
- Implement only minimal gate behavior needed to enforce the publication restriction. Do not build a rights-management platform, new adapter hierarchy, generic repository framework, or administration interface.

## Testing Decisions

- The main catalog behavior seam is the public catalog procedure interface. Prefer direct oRPC calls with typed request contexts, the real request logger, and anonymous sessions. Exercise real owned query behavior against a disposable local database where filtering and ordering depend on SQL. Do not mock the catalog procedures, middleware, or query implementation to prove their behavior.
- Catalog installation has a separate necessary seam because it is an operator action rather than a read procedure. Test the import operation through its observable outcomes: persisted catalog state, returned summary, failure behavior, and subsequent catalog reads. Avoid asserting helper calls, SQL statement spelling, internal fingerprints, or filesystem probing order.
- Good tests prove external behavior and durable domain invariants, not the chosen internal decomposition. Keep fixtures small and local, with repeated names, ambiguous classifications, primary/secondary relationships, literal wildcard characters, missing media, and retired exercises.
- Procedure coverage proves anonymous access when publication is enabled; disabled publication behavior; name-search semantics; each filter group; OR within groups and AND across groups; primary-muscle mode; bounded pagination; deterministic ties; absence of duplicate results; unknown identifiers; and active versus retired details.
- Import integration coverage proves full-input validation, duplicate ID and duplicate relationship rejection, dangling-reference rejection, rollback, rerun safety, stable identity, relationship removal, exercise retirement/reactivation, mapping preservation, and isolation from unrelated records. Use a disposable local PostgreSQL database, never a shared development or production database.
- Verify the full source can pass source validation and mapping checks locally when its permitted use allows it. Keep structural assertions separate from incidental counts and do not require network access to the old bucket. Do not publish the dataset merely to run tests.
- Add focused pure-domain tests only for behavior not already proved effectively through catalog reads or import outcomes, such as mapping policy or URL encoding. Reuse the existing table-driven core asset tests as prior art for deterministic URL/fallback behavior.
- Use existing direct private-procedure tests as prior art for typed context construction, direct calls, real logging, and typed error assertions. The new catalog tests must prove anonymous success, not copy the old protected-route expectation.
- Adapt valuable cases from the old catalog validation, idempotent import, media URL, and muscle mapping tests. Do not transplant native snapshot installer tests or tests of excluded personal editing and synchronization behavior.
- Add a small web browser workflow test for anonymous entry, search plus filtering, detail navigation, and a meaningful failure/missing-content state. Browser tests cover routing/rendering integration rather than repeating the entire server filtering matrix.
- Verify equivalent native workflows using the narrowest practical native test or device/emulator smoke surface available in the repo. Do not claim native device behavior was tested solely because shared TypeScript contracts compile. Confirm public navigation bypasses login/onboarding and that a failed asset does not crash details.
- Test the publication gate at public reads and asset delivery/build inclusion as applicable. UI-only hiding is insufficient. Unapproved fixtures must not escape into deployable bundles.
- Do not contact remote third-party services during routine tests. Model media success/failure locally. Do not test frameworks' pass-through behavior or add broad snapshots and arbitrary coverage targets.
- Use Vite+ test conventions, existing test locations, and package-local commands where practical. Validate focused tests after the prescribed fix command, then perform workspace checks and relevant web/native build validation for cross-package changes. Report environmental blockers honestly.

## Out of Scope

- PowerSync, synchronization providers, uploads, outboxes, account-sync lifecycle, and offline promises.
- Native SQLite catalog downloads, snapshot generation, manifests, installers, and device catalog update machinery.
- Personal exercise creation/editing, custom equipment editing, favorites, gym inventories, and available-equipment feasibility matching.
- Routine planning, workout recording, progression, health records, and migration of existing users or personal data.
- Publicly releasing catalog data or assets before their respective provenance and redistribution permission are established.
- Resolving licensing through assumption, scraping additional datasets, purchasing rights, or commissioning replacement artwork within this implementation.
- Invented coaching instructions, automatic anatomical inference, AI-generated classification, and name-based exercise deduplication.
- Complete manual review of all 7,542 exercises or forced canonical classification of every ambiguous source label before local implementation.
- Automatic startup imports, automatic deployment imports, new account/credential seeding, or live-database changes without separate approval.
- Wholesale copying of old infrastructure, package structure, documentation, OpenAPI artifacts, or unrelated application features.

## Further Notes

- Source for the port is the previous local Callus repository identified during the interview. The audit was read-only and did not access live databases or secrets.
- The old muscle documentation identifies a Lyfta APK as the source of its recovered mapping, and the audited material does not establish redistribution permission for the accompanying illustrations. The exercise dataset and bucket media also lack established permission evidence in the inspected files. Treat publication permission as unresolved for all three content classes until verified separately.
- The user explicitly chose to gate publication while continuing design/local work. Public browsing is the intended eventual access model, not authorization to release uncertain material now.
- Testing seams were selected from the user's agreed architecture and the current repo's testing policies without another interview: public catalog procedures for reads, the import operation for installation/update lifecycle, and focused client workflow checks for routing/rendering. No new test-only architectural layer is required.
- The current repo contains only health/private API examples and small shared/auth/native unit tests, so exercise-specific coverage is new. Extend those established patterns rather than restoring the old test architecture.
- This spec records the interview decisions. It does not authorize applying migrations or catalog imports to a live database.
- Intended issue title: Port the exercise catalog with public web and native browsing.
- Intended triage label: ready-for-agent. This denotes implementation readiness with publication deliberately gated; it does not certify content rights.
- GitHub publication is pending because the checkout has no configured Git remote. No issue has been created and no tracker label has been applied. Publish this spec to the actual project repository once its destination is known.
