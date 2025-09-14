# Database Indexes

## Comment Table Indexes

### Composite Index: `idx_comment_winner_food_created`

**Columns:** `(winner_food_id, created_at DESC)`

**Purpose:** Optimizes expanded comment queries for the enhanced comment visibility feature.

#### Query Patterns Optimized:

1. **Expanded Comments Query:**
   ```sql
   SELECT * FROM comment 
   WHERE winner_food_id = ? 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

2. **Multi-Food Comments Query:**
   ```sql
   SELECT * FROM comment 
   WHERE (winner_food_id = ? OR winner_food_id = ?) 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

#### Performance Benefits:

- **Efficient Filtering:** The index allows fast lookup of comments by `winner_food_id`
- **Optimized Sorting:** The `DESC` order matches our query pattern (newest comments first)
- **Reduced I/O:** Index covers both filter and sort operations, minimizing disk reads
- **Scalability:** Performance remains consistent as comment volume grows

#### Use Cases:

- **Expanded Comment Visibility:** Finding comments from users who voted for specific foods across different pairings
- **Food-Specific Analytics:** Analyzing comment patterns for individual foods
- **Chronological Browsing:** Displaying recent comments for specific foods

#### Index Selectivity:

- **winner_food_id:** High selectivity (many different foods in the system)
- **created_at:** Very high selectivity (unique timestamps)

This combination provides excellent query performance for the expanded comment feature while maintaining efficient storage usage.

## Migration History

- **0003_lush_blue_marvel.sql:** Added composite index for expanded comment performance