(defun classify (n)
  (cond
    ((< n 0) "negative")
    ((= n 0) "zero")
    (t "positive")))

(write (classify -5))
(write (classify 0))
(write (classify 5))

; a clause with no matching test falls through to nil
(write (cond ((= 1 2) "a") ((= 3 4) "b")))
