(defun classify (n)
  (cond
    ((< n 0) "negative")
    ((= n 0) "zero")
    (t "positive")))

(print (classify -5))
(print (classify 0))
(print (classify 5))

; a clause with no matching test falls through to nil
(print (cond ((= 1 2) "a") ((= 3 4) "b")))
