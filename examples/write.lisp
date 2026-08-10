; write behaves like print but does not add a trailing newline,
; so it can be composed with print to finish the line
(write "Result: ")
(print 42)

; without a following print, calls just run together
(write 1)
(write 2)
(write 3)
