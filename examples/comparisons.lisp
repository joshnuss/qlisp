; =
(print (if (= 1 2) kaboom "pass"))
(print (if (= 1 1) "pass"))

; >
(print (if (> 1 2) kaboom "pass"))
(print (if (> 2 1) "pass"))

; >=
(print (if (>= 1 2) kaboom "pass"))
(print (if (>= 2 1) "pass"))
(print (if (>= 1 1) "pass"))

; <
(print (if (< 2 1) kaboom "pass"))
(print (if (< 1 2) "pass"))

; <=
(print (if (<= 2 1) kaboom "pass"))
(print (if (<= 1 2) "pass"))
(print (if (<= 1 1) "pass"))

; not
(print (if (not t) kaboom "pass"))
(print (if (not nil) "pass"))

